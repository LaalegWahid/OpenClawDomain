import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { getServiceEnabled, setServiceEnabled } from "../../../../shared/lib/service/status";

function requireAdmin(role: string | null | undefined) {
  if (role !== "admin") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(req: Request) {
  const session = await getSessionOrThrow(req);
  requireAdmin(session.user.role);

  const enabled = await getServiceEnabled();
  return NextResponse.json({ serviceEnabled: enabled });
}

export async function POST(req: Request) {
  const session = await getSessionOrThrow(req);
  requireAdmin(session.user.role);

  const body = await req.json();
  if (typeof body.serviceEnabled !== "boolean") {
    return NextResponse.json({ error: "serviceEnabled must be a boolean" }, { status: 400 });
  }

  await setServiceEnabled(body.serviceEnabled);
  return NextResponse.json({ serviceEnabled: body.serviceEnabled });
}
