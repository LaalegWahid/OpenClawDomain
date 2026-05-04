import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../shared/lib/auth/getSessionOrThrow";
import { isValidAgentType, type AgentType } from "../../../shared/lib/agents/config";
import { db } from "../../../shared/lib/drizzle";
import { eq, sql, and, inArray, count } from "drizzle-orm";
import { deleteWebhook, setWebhook, validateBotToken } from "../../../shared/lib/telegram/bot";
import { agent, agentActivity, agentChannel } from "../../../shared/db/schema/agent";
import { skill, agentSkill } from "../../../shared/db/schema/skill";
import { user } from "../../../shared/db/schema/auth";
import { agentSubscription } from "../../../shared/db/schema/subscription";

import { launchContainer, stopContainer, waitForTaskRunning } from "../../../shared/lib/agents/docker";
import { startDiscordBot } from "../../../shared/lib/discord/manager";
import { logger } from "../../../shared/lib/logger";
import { env } from "../../../shared/config/env";
import { encryptIfPresent, decryptIfPresent } from "../../../shared/lib/crypto";
import {
  hasUsablePaymentMethod,
  createAgentSubscription,
  pickAgentPriceId,
  countActivePaidAgentSubscriptions,
  repriceUserAgentSubscriptions,
} from "../../../shared/lib/stripe/stripe.service";
import { enforceUserTrialKills } from "../../../shared/lib/agents/trial-enforcer";

const FREE_TRIAL_DAYS = 15;

interface SubscriptionDecision {
  hasDeveloperAccess: boolean;
  usingFreeTrial: boolean;
  usingFreeCredit: boolean;
  agentPriceId?: string;
}

async function handleAgentSubscription(
  userId: string,
  agentId: string,
  decision: SubscriptionDecision,
) {
  if (decision.hasDeveloperAccess) {
    const now = new Date();
    const oneMonthLater = new Date(now);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    await db.insert(agentSubscription).values({
      userId,
      agentId,
      stripeSubscriptionId: `developer_${agentId}`,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: oneMonthLater,
    });
    return;
  }
  if (decision.usingFreeTrial) {
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + FREE_TRIAL_DAYS);
    await db.insert(agentSubscription).values({
      userId,
      agentId,
      stripeSubscriptionId: `free_trial_${agentId}`,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
    });
    return;
  }
  if (decision.usingFreeCredit) {
    const now = new Date();
    const oneMonthLater = new Date(now);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    await db.insert(agentSubscription).values({
      userId,
      agentId,
      stripeSubscriptionId: `free_referral_${agentId}`,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: oneMonthLater,
    });
    await db
      .update(user)
      .set({ freeAgentCredits: sql`${user.freeAgentCredits} - 1` })
      .where(eq(user.id, userId));
    return;
  }
  await createAgentSubscription(userId, agentId, decision.agentPriceId);
}

/**
 * After a paid agent is added, reprice the user's existing paid agent
 * subscriptions to match the new volume tier (e.g. crossing from 5→6 active
 * agents drops every agent from $30 to $29). The new agent's subscription is
 * already on the right price, so we exclude it. Stripe calls happen in the
 * background — failures are logged, not surfaced.
 */
function applyTierReprice(userId: string, newAgentId: string, agentPriceId: string | undefined) {
  if (!agentPriceId) return;
  repriceUserAgentSubscriptions(userId, agentPriceId, newAgentId).catch((err) => {
    logger.warn({ err, userId, newAgentId }, "Failed to reprice existing agent subscriptions");
  });
}

async function linkSkillsToAgent(agentId: string, userId: string, skillIds?: string[]) {
  if (!skillIds || skillIds.length === 0) return;
  const owned = await db
    .select({ id: skill.id })
    .from(skill)
    .where(and(eq(skill.userId, userId), inArray(skill.id, skillIds)));
  const ownedIds = owned.map((s) => s.id);
  if (ownedIds.length > 0) {
    await db.insert(agentSkill).values(
      ownedIds.map((skillId) => ({ agentId, skillId })),
    );
  }
}

/**
 * Extracts and encrypts the single per-agent API key from the request body.
 * Fields: apiProvider ("anthropic", "mistral", …), apiKey (the secret), agentModel.
 */
function extractEncryptedKeys(body: Record<string, unknown>) {
  return {
    apiProvider: (body.apiProvider as string | undefined)?.trim().toLowerCase() || null,
    apiKey: encryptIfPresent(body.apiKey as string | undefined),
    agentModel: (body.agentModel as string | undefined)?.trim() || null,
  };
}

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow(req);

    const body = await req.json();
    const { platform = "telegram", name, systemPrompt, type, skillIds, profileImage } = body;

    if (!name || !systemPrompt || !type) {
      return NextResponse.json(
        { error: "name, systemPrompt, and type are required" },
        { status: 400 },
      );
    }

    if (!isValidAgentType(type)) {
      return NextResponse.json(
        { error: "Invalid agent type. Must be a non-empty description (1–60 characters, no control characters)." },
        { status: 400 },
      );
    }

    if (!["telegram", "discord", "whatsapp"].includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    // Check developer access and free credits
    const [me] = await db
      .select({
        freeAgentCredits: user.freeAgentCredits,
        developerAccess: user.developerAccess,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    const hasDeveloperAccess = me?.developerAccess ?? false;

    // First-agent-ever 15-day free trial: applies the very first time a user creates
    // an agent. Counted via agent_subscription history so deleting and re-creating
    // doesn't grant a second trial. Dev-access users skip this — they already get
    // monthly developer subscriptions.
    const [{ priorAgentSubs }] = await db
      .select({ priorAgentSubs: count() })
      .from(agentSubscription)
      .where(eq(agentSubscription.userId, session.user.id));
    const usingFreeTrial = !hasDeveloperAccess && Number(priorAgentSubs) === 0;

    const usingFreeCredit = !hasDeveloperAccess && !usingFreeTrial && (me?.freeAgentCredits ?? 0) > 0;

    // Require a payment method on file unless the user has dev access, a free trial, or a referral credit
    if (!hasDeveloperAccess && !usingFreeTrial && !usingFreeCredit) {
      const canBill = await hasUsablePaymentMethod(session.user.id);
      if (!canBill) {
        return NextResponse.json(
          { error: "missing_payment_method", message: "Add a debit/credit card in Billing before creating an agent." },
          { status: 402 },
        );
      }
    }

    // Pick the volume-tier price for paid agents based on how many active paid
    // subscriptions the user already has (the new agent makes count + 1).
    let agentPriceId: string | undefined;
    if (!hasDeveloperAccess && !usingFreeTrial && !usingFreeCredit) {
      const activePaid = await countActivePaidAgentSubscriptions(session.user.id);
      agentPriceId = pickAgentPriceId(activePaid + 1);
    }

    const subscriptionDecision: SubscriptionDecision = {
      hasDeveloperAccess,
      usingFreeTrial,
      usingFreeCredit,
      agentPriceId,
    };

    // Encrypt any per-agent API keys from the request body
    const encryptedKeys = extractEncryptedKeys(body);

    // Decrypted key to inject into the container at launch
    const apiKeys = {
      apiProvider: encryptedKeys.apiProvider ?? undefined,
      apiKey: decryptIfPresent(encryptedKeys.apiKey),
      agentModel: encryptedKeys.agentModel ?? undefined,
    };

    // Check if user has any existing agents — first bot gets marked as primary
    const existingAgents = await db
      .select({ id: agent.id })
      .from(agent)
      .where(eq(agent.userId, session.user.id))
      .limit(1);

    const isFirstBot = existingAgents.length === 0;

    const tempAgentId = crypto.randomUUID();

    // ── TELEGRAM ─────────────────────────────────────────────────────────────
    if (platform === "telegram") {
      const { botToken, botUsername } = body;

      if (!botToken || !botUsername) {
        return NextResponse.json(
          { error: "botToken and botUsername are required for Telegram" },
          { status: 400 },
        );
      }

      let botInfo;
      try {
        botInfo = await validateBotToken(botToken);
      } catch {
        return NextResponse.json(
          { error: "Invalid bot token. Please check your token from BotFather." },
          { status: 400 },
        );
      }

      if (botInfo.username.toLowerCase() !== botUsername.toLowerCase()) {
        return NextResponse.json(
          { error: `Bot username mismatch. Token belongs to @${botInfo.username}` },
          { status: 400 },
        );
      }

      const [existingBot] = await db
        .select()
        .from(agent)
        .where(eq(agent.botToken, botToken))
        .limit(1);

      if (existingBot) {
        return NextResponse.json({ error: "Bot already registered" }, { status: 409 });
      }

      let containerId: string;
      try {
        const result = await launchContainer(
          session.user.id,
          tempAgentId,
          type as AgentType,
          { telegram: { botToken, webhookSecret: env.TELEGRAM_WEBHOOK_SECRET } },
          undefined,
          apiKeys,
        );
        containerId = result.containerId;
      } catch (err) {
        logger.error({ err }, "Failed to launch agent container");
        return NextResponse.json(
          { error: "ECS task failed to start for this agent. Check cluster logs and task definition." },
          { status: 500 },
        );
      }

      try {
        const webhookUrl = `${env.WEBHOOK_BASE_URL}/api/telegram/webhook/${tempAgentId}`;
        await setWebhook(botToken, webhookUrl, env.TELEGRAM_WEBHOOK_SECRET);
      } catch (err) {
        await stopContainer(containerId).catch(() => {});
        await deleteWebhook(botToken).catch(() => {});
        logger.error({ err }, "Failed to set webhook");
        return NextResponse.json(
          { error: "Telegram API rejected the webhook setup. Verify bot token and webhook URL." },
          { status: 500 },
        );
      }

      try {
        const [newAgent] = await db
          .insert(agent)
          .values({
            id: tempAgentId,
            userId: session.user.id,
            name,
            botToken,
            botUsername: botInfo.username,
            systemPrompt,
            type: type as AgentType,
            status: "starting",
            isPrimary: isFirstBot,
            containerId,
            ...encryptedKeys,
            profileImage: profileImage || null,
          })
          .returning();

        try {
          await handleAgentSubscription(session.user.id, newAgent.id, subscriptionDecision);
        } catch (subErr) {
          await db.delete(agent).where(eq(agent.id, newAgent.id));
          await stopContainer(containerId).catch(() => {});
          await deleteWebhook(botToken).catch(() => {});
          logger.error({ subErr, agentId: newAgent.id }, "Stripe subscription creation failed");
          return NextResponse.json(
            { error: "Failed to create subscription for this agent. Please verify your card and try again." },
            { status: 500 },
          );
        }

        await db.insert(agentActivity).values({ agentId: newAgent.id, type: "launch", message: `${name} launched on Telegram` });
        await linkSkillsToAgent(newAgent.id, session.user.id, skillIds);
        applyTierReprice(session.user.id, newAgent.id, agentPriceId);

        waitForTaskRunning(containerId)
          .then(() => db.update(agent).set({ status: "active" }).where(eq(agent.id, tempAgentId)))
          .catch(async (err) => {
            logger.error({ err, agentId: tempAgentId }, "Task never reached RUNNING");
            await db.update(agent).set({ status: "error" }).where(eq(agent.id, tempAgentId));
          });

        logger.info({ agentId: newAgent.id, userId: session.user.id, platform: "telegram" }, "Agent launched");
        return NextResponse.json({ agent: newAgent }, { status: 201 });
      } catch (err) {
        await stopContainer(containerId).catch(() => {});
        await deleteWebhook(botToken).catch(() => {});
        logger.error({ err }, "Failed to save agent to database");
        return NextResponse.json(
          { error: "Database insert failed after container and webhook succeeded. Rolled back." },
          { status: 500 },
        );
      }
    }

    // ── DISCORD ───────────────────────────────────────────────────────────────
    if (platform === "discord") {
      const credentials = body.credentials as { botToken?: string } | undefined;
      if (!credentials?.botToken) {
        return NextResponse.json({ error: "credentials.botToken is required for Discord" }, { status: 400 });
      }

      const discordToken = credentials.botToken;
      const placeholderUsername = `discord_${tempAgentId.split("-")[0]}`;

      const [existingDiscordBot] = await db
        .select()
        .from(agent)
        .where(eq(agent.botToken, discordToken))
        .limit(1);

      if (existingDiscordBot) {
        return NextResponse.json({ error: "Bot already registered" }, { status: 409 });
      }

      const existingChannels = await db.select().from(agentChannel).where(eq(agentChannel.platform, "discord"));
      const tokenConflict = existingChannels.some(
        (ch) => (ch.credentials as Record<string, string>)?.botToken === discordToken,
      );
      if (tokenConflict) {
        return NextResponse.json({ error: "Bot already registered" }, { status: 409 });
      }

      let containerId: string;
      try {
        const result = await launchContainer(
          session.user.id,
          tempAgentId,
          type as AgentType,
          { discord: { botToken: discordToken } },
          undefined,
          apiKeys,
        );
        containerId = result.containerId;
      } catch (err) {
        logger.error({ err }, "Failed to launch agent container");
        return NextResponse.json(
          { error: "ECS task failed to start for this agent." },
          { status: 500 },
        );
      }

      try {
        const [newAgent] = await db
          .insert(agent)
          .values({
            id: tempAgentId,
            userId: session.user.id,
            name,
            botToken: discordToken,
            botUsername: placeholderUsername,
            systemPrompt,
            type: type as AgentType,
            status: "starting",
            isPrimary: isFirstBot,
            containerId,
            ...encryptedKeys,
            profileImage: profileImage || null,
          })
          .returning();

        try {
          await handleAgentSubscription(session.user.id, newAgent.id, subscriptionDecision);
        } catch (subErr) {
          await db.delete(agent).where(eq(agent.id, newAgent.id));
          await stopContainer(containerId).catch(() => {});
          logger.error({ subErr, agentId: newAgent.id }, "Stripe subscription creation failed");
          return NextResponse.json(
            { error: "Failed to create subscription for this agent. Please verify your card and try again." },
            { status: 500 },
          );
        }

        await db.insert(agentChannel).values({ agentId: newAgent.id, platform: "discord", credentials: { botToken: discordToken } });
        await db.insert(agentActivity).values({ agentId: newAgent.id, type: "launch", message: `${name} launched on Discord` });
        await linkSkillsToAgent(newAgent.id, session.user.id, skillIds);
        applyTierReprice(session.user.id, newAgent.id, agentPriceId);

        startDiscordBot(newAgent.id, discordToken, type as AgentType)
          .catch((err) => logger.error({ err, agentId: newAgent.id }, "Failed to start Discord bot"));

        waitForTaskRunning(containerId)
          .then(() => db.update(agent).set({ status: "active" }).where(eq(agent.id, tempAgentId)))
          .catch(async (err) => {
            logger.error({ err, agentId: tempAgentId }, "Task never reached RUNNING");
            await db.update(agent).set({ status: "error" }).where(eq(agent.id, tempAgentId));
          });

        logger.info({ agentId: newAgent.id, userId: session.user.id, platform: "discord" }, "Agent launched");
        return NextResponse.json({ agent: newAgent }, { status: 201 });
      } catch (err) {
        await stopContainer(containerId).catch(() => {});
        logger.error({ err }, "Failed to save Discord agent");
        return NextResponse.json({ error: "Database insert failed. Rolled back." }, { status: 500 });
      }
    }

    // ── WHATSAPP ──────────────────────────────────────────────────────────────
    if (platform === "whatsapp") {
      const placeholderToken = `whatsapp_${tempAgentId.split("-")[0]}`;
      const placeholderUsername = `whatsapp_${tempAgentId.replace(/-/g, "").slice(0, 12)}`;

      let containerId: string;
      try {
        const result = await launchContainer(
          session.user.id,
          tempAgentId,
          type as AgentType,
          undefined,
          undefined,
          apiKeys,
        );
        containerId = result.containerId;
      } catch (err) {
        logger.error({ err }, "Failed to launch agent container");
        return NextResponse.json({ error: "ECS task failed to start for this agent." }, { status: 500 });
      }

      try {
        const [newAgent] = await db
          .insert(agent)
          .values({
            id: tempAgentId,
            userId: session.user.id,
            name,
            botToken: placeholderToken,
            botUsername: placeholderUsername,
            systemPrompt,
            type: type as AgentType,
            status: "starting",
            isPrimary: isFirstBot,
            containerId,
            ...encryptedKeys,
            profileImage: profileImage || null,
          })
          .returning();

        try {
          await handleAgentSubscription(session.user.id, newAgent.id, subscriptionDecision);
        } catch (subErr) {
          await db.delete(agent).where(eq(agent.id, newAgent.id));
          await stopContainer(containerId).catch(() => {});
          logger.error({ subErr, agentId: newAgent.id }, "Stripe subscription creation failed");
          return NextResponse.json(
            { error: "Failed to create subscription for this agent. Please verify your card and try again." },
            { status: 500 },
          );
        }

        await db.insert(agentActivity).values({ agentId: newAgent.id, type: "launch", message: `${name} launched — link WhatsApp to activate` });
        await linkSkillsToAgent(newAgent.id, session.user.id, skillIds);
        applyTierReprice(session.user.id, newAgent.id, agentPriceId);

        waitForTaskRunning(containerId)
          .then(() => db.update(agent).set({ status: "active" }).where(eq(agent.id, tempAgentId)))
          .catch(async (err) => {
            logger.error({ err, agentId: tempAgentId }, "Task never reached RUNNING");
            await db.update(agent).set({ status: "error" }).where(eq(agent.id, tempAgentId));
          });

        logger.info({ agentId: newAgent.id, userId: session.user.id, platform: "whatsapp" }, "WhatsApp agent launched (pending QR link)");
        return NextResponse.json({ agent: newAgent }, { status: 201 });
      } catch (err) {
        await stopContainer(containerId).catch(() => {});
        logger.error({ err }, "Failed to save WhatsApp agent");
        return NextResponse.json({ error: "Database insert failed. Rolled back." }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Unhandled error in POST /api/agents. Check server logs." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getSessionOrThrow(req);

    // Lazy trial enforcement: stop any of this user's free-trial agents whose
    // 15-day window has elapsed. Best-effort — if it fails, listing still works.
    await enforceUserTrialKills(session.user.id).catch((err) => {
      logger.warn({ err, userId: session.user.id }, "Trial kill sweep failed");
    });

    const rows = await db
      .select({
        agent: agent,
        subStripeId: agentSubscription.stripeSubscriptionId,
        subStatus: agentSubscription.status,
        subPeriodEnd: agentSubscription.currentPeriodEnd,
      })
      .from(agent)
      .leftJoin(agentSubscription, eq(agentSubscription.agentId, agent.id))
      .where(eq(agent.userId, session.user.id));

    const now = Date.now();
    const safeAgents = rows.map(({ agent: a, subStripeId, subStatus, subPeriodEnd }) => {
      const { apiKey, ...rest } = a;
      const trialKind: "free_trial" | "developer" | "free_referral" | null =
        subStatus === "active" && subPeriodEnd instanceof Date
          ? subStripeId?.startsWith("free_trial_")
            ? "free_trial"
            : subStripeId?.startsWith("developer_")
              ? "developer"
              : subStripeId?.startsWith("free_referral_")
                ? "free_referral"
                : null
          : null;
      const trialDaysLeft = trialKind && subPeriodEnd instanceof Date
        ? Math.max(0, Math.ceil((subPeriodEnd.getTime() - now) / 86_400_000))
        : null;
      return { ...rest, trialDaysLeft, trialKind };
    });

    logger.info({ userId: session.user.id, count: safeAgents.length }, "Agents listed");
    return NextResponse.json({ agents: safeAgents });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Unhandled error in GET /api/agents. Check server logs." }, { status: 500 });
  }
}