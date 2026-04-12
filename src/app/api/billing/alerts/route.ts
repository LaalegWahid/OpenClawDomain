/**
 * GET  /api/billing/alerts        — get all alerts for current user
 * POST /api/billing/alerts        — mark all as read
 * PUT  /api/billing/alerts/[id]   — mark single alert as read (handled in /[id]/route.ts)
 */

import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import {
  getAllAlerts,
  markAllAlertsRead,
} from "../../../../shared/lib/billing/billing.service";

export async function GET(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    const alerts = await getAllAlerts(session.user.id);
    return NextResponse.json({ alerts });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    await markAllAlertsRead(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Failed to mark alerts read" }, { status: 500 });
  }
}
