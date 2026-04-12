/**
 * GET /api/billing/summary
 * Returns everything the billing dashboard needs in one request:
 * tier, pricePerAgent, agentCount, monthlyTotal, trial status, alerts, next bill date.
 */

import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { getBillingDashboardData } from "../../../../shared/lib/billing/billing.service";

export async function GET(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    const data = await getBillingDashboardData(session.user.id);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Failed to fetch billing summary" }, { status: 500 });
  }
}
