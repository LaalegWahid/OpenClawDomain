import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../../shared/lib/drizzle";
import { eq, desc } from "drizzle-orm";
import { agent } from "../../../../../../shared/db/schema/agent";
import { whatsappLinkSession } from "../../../../../../shared/db/schema/agent";
import { launchWhatsappLinker, stopContainer } from "../../../../../../shared/lib/agents/docker";
import { logger } from "../../../../../../shared/lib/logger";

type Ctx = { params: Promise<{ id: string }> };

// ── POST — start a new WhatsApp link session ──────────────────────────────────
export async function POST(req: Request, ctx: Ctx) {
  try {
    const session = await getSessionOrThrow(req);
    const { id } = await ctx.params;

    const [agentRecord] = await db
      .select()
      .from(agent)
      .where(eq(agent.id, id))
      .limit(1);

    if (!agentRecord || agentRecord.userId !== session.user.id) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Block re-linking when the agent has previously been launched but is now
    // stopped or errored. A brand-new WhatsApp-only agent (no containerId yet)
    // is allowed through — the container is launched after linking completes.
    if (
      agentRecord.containerId &&
      (agentRecord.status === "stopped" || agentRecord.status === "error")
    ) {
      return NextResponse.json(
        { error: "Agent must be running before you can link WhatsApp" },
        { status: 409 },
      );
    }

    // Expire any previous pending sessions for this agent
    const existing = await db
      .select()
      .from(whatsappLinkSession)
      .where(eq(whatsappLinkSession.agentId, id))
      .orderBy(desc(whatsappLinkSession.createdAt))
      .limit(1);

    if (existing[0] && existing[0].taskArn && existing[0].status === "pending") {
      await stopContainer(existing[0].taskArn).catch(() => {});
    }

    const body = await req.json().catch(() => ({})) as { ownerPhone?: string };
    const ownerPhone = body.ownerPhone?.trim() || null;

    // Launch a short-lived ECS linker task
    const taskArn = await launchWhatsappLinker(
      agentRecord.userId,
      agentRecord.id,
      agentRecord.type as import("../../../../../../shared/lib/agents/config").AgentType,
    );

    const [linkSession] = await db
      .insert(whatsappLinkSession)
      .values({ agentId: id, taskArn, status: "pending", ownerPhone })
      .returning();

    logger.info({ agentId: id, taskArn }, "WhatsApp link session started");
    return NextResponse.json({ session: linkSession }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to start WhatsApp link session");
    return NextResponse.json({ error: "Failed to start WhatsApp linking" }, { status: 500 });
  }
}

// ── GET — poll current link session status / QR ───────────────────────────────
export async function GET(req: Request, ctx: Ctx) {
  try {
    const session = await getSessionOrThrow(req);
    const { id } = await ctx.params;

    const [agentRecord] = await db
      .select({ userId: agent.userId })
      .from(agent)
      .where(eq(agent.id, id))
      .limit(1);

    if (!agentRecord || agentRecord.userId !== session.user.id) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const [linkSession] = await db
      .select()
      .from(whatsappLinkSession)
      .where(eq(whatsappLinkSession.agentId, id))
      .orderBy(desc(whatsappLinkSession.createdAt))
      .limit(1);

    if (!linkSession) {
      return NextResponse.json({ status: "none" });
    }

    return NextResponse.json({
      status: linkSession.status,
      qrData: linkSession.qrData,
      updatedAt: linkSession.updatedAt,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Failed to get link status" }, { status: 500 });
  }
}

// ── DELETE — cancel the current link session ──────────────────────────────────
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const session = await getSessionOrThrow(req);
    const { id } = await ctx.params;

    const [agentRecord] = await db
      .select({ userId: agent.userId })
      .from(agent)
      .where(eq(agent.id, id))
      .limit(1);

    if (!agentRecord || agentRecord.userId !== session.user.id) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const [linkSession] = await db
      .select()
      .from(whatsappLinkSession)
      .where(eq(whatsappLinkSession.agentId, id))
      .orderBy(desc(whatsappLinkSession.createdAt))
      .limit(1);

    if (linkSession?.taskArn) {
      await stopContainer(linkSession.taskArn).catch(() => {});
    }

    if (linkSession) {
      await db
        .update(whatsappLinkSession)
        .set({ status: "expired" })
        .where(eq(whatsappLinkSession.id, linkSession.id));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Failed to cancel link session" }, { status: 500 });
  }
}
