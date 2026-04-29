import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSessionOrThrow } from "../../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../../shared/lib/drizzle";
import { user } from "../../../../../../shared/db/schema/auth";

function requireAdmin(role: string | null | undefined) {
  if (role !== "admin") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionOrThrow(req);
  requireAdmin(session.user.role);

  const { id } = await params;
  const body = await req.json();
  if (typeof body.developerAccess !== "boolean") {
    return NextResponse.json(
      { error: "developerAccess must be a boolean" },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(user)
    .set({ developerAccess: body.developerAccess })
    .where(eq(user.id, id))
    .returning({ id: user.id, developerAccess: user.developerAccess });

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
