import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../shared/lib/drizzle";
import { agentCreationFeedback } from "../../../../shared/db/schema";

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    const { rating, comment, agentId } = await req.json();

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    await db.insert(agentCreationFeedback).values({
      userId: session.user.id,
      agentId: typeof agentId === "string" ? agentId : null,
      rating,
      comment: typeof comment === "string" && comment.trim() ? comment.trim().slice(0, 2000) : null,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
