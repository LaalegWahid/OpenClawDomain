import { NextResponse } from "next/server";
import { db } from "../../../../../../shared/lib/drizzle";
import { eq, desc, and } from "drizzle-orm";
import { agent, agentChannel, agentActivity, whatsappLinkSession } from "../../../../../../shared/db/schema/agent";
import { logger } from "../../../../../../shared/lib/logger";
import { env } from "../../../../../../shared/config/env";
import { relaunchAgentWithChannels } from "../../../../../../shared/lib/agents/relaunch";

type Ctx = { params: Promise<{ id: string }> };

// Internal endpoint — called by the WhatsApp linker ECS task (not user-facing)
export async function POST(req: Request, ctx: Ctx) {
  // Authenticate using the shared GATEWAY_TOKEN
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${env.GATEWAY_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    const body = await req.json() as { status: string; qrData?: string; error?: string };

    const [agentRecord] = await db
      .select()
      .from(agent)
      .where(eq(agent.id, id))
      .limit(1);

    if (!agentRecord) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const [linkSession] = await db
      .select()
      .from(whatsappLinkSession)
      .where(eq(whatsappLinkSession.agentId, id))
      .orderBy(desc(whatsappLinkSession.createdAt))
      .limit(1);

    if (!linkSession) {
      return NextResponse.json({ error: "No active link session" }, { status: 404 });
    }

    if (body.status === "qr_ready" && body.qrData) {
      await db
        .update(whatsappLinkSession)
        .set({ status: "qr_ready", qrData: body.qrData })
        .where(eq(whatsappLinkSession.id, linkSession.id));

      logger.info({ agentId: id }, "WhatsApp QR code updated");
      return NextResponse.json({ ok: true });
    }

    if (body.status === "linked") {
      // Mark session as linked
      await db
        .update(whatsappLinkSession)
        .set({ status: "linked" })
        .where(eq(whatsappLinkSession.id, linkSession.id));

      // Create the channel record so the agent shows WhatsApp as connected
      const existingChannel = await db
        .select()
        .from(agentChannel)
        .where(eq(agentChannel.agentId, id))
        .then((rows: { platform: string }[]) => rows.find((r) => r.platform === "whatsapp"));

      const ownerJid = linkSession.ownerPhone
        ? `${linkSession.ownerPhone.replace(/^\+/, "")}@s.whatsapp.net`
        : null;

      if (!existingChannel) {
        await db.insert(agentChannel).values({
          agentId: id,
          platform: "whatsapp",
          credentials: ownerJid ? { ownerJid } : {},
          enabled: true,
        });
      } else if (ownerJid) {
        await db
          .update(agentChannel)
          .set({ credentials: { ownerJid } })
          .where(and(eq(agentChannel.agentId, id), eq(agentChannel.platform, "whatsapp")));
      }

      await db.insert(agentActivity).values({
        agentId: id,
        type: "channel_linked",
        message: `${agentRecord.name} linked to WhatsApp`,
      });

      logger.info({ agentId: id }, "WhatsApp linked successfully");

      // Relaunch the agent container so it picks up channels.whatsapp from EFS creds
      relaunchAgentWithChannels(id).catch((err) =>
        logger.error({ err, agentId: id }, "Relaunch after WhatsApp link failed"),
      );

      return NextResponse.json({ ok: true });
    }

    if (body.status === "failed") {
      await db
        .update(whatsappLinkSession)
        .set({ status: "failed" })
        .where(eq(whatsappLinkSession.id, linkSession.id));

      logger.warn({ agentId: id, error: body.error }, "WhatsApp linking failed");
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown status" }, { status: 400 });
  } catch (err) {
    logger.error({ err }, "WhatsApp callback error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
