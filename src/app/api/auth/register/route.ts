import { NextResponse } from "next/server";
import { auth } from "../../../../shared/lib/auth/server";
import { logger } from "../../../../shared/lib/logger";

// Better Auth throws structured API errors — this narrows the type
interface BetterAuthError {
  status?: number;
  body?: { message?: string; code?: string };
}

function isBetterAuthError(err: unknown): err is BetterAuthError {
  return typeof err === "object" && err !== null && "status" in err;
}

export async function POST(req: Request) {
  // ── 1. Parse & validate body ────────────────────────────────────────────────
  let name: string, email: string, password: string;

  try {
    ({ name, email, password } = await req.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const missing = (["name", "email", "password"] as const).filter(
    (f) => !{ name, email, password }[f],
  );
  if (missing.length) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  // ── 2. Call Better Auth ─────────────────────────────────────────────────────
  let result: Awaited<ReturnType<typeof auth.api.signUpEmail>>;

  try {
    result = await auth.api.signUpEmail({ body: { name, email, password } });
  } catch (err) {
    // Better Auth surfaces validation / conflict errors as structured throws
    if (isBetterAuthError(err)) {
      const message = err.body?.message ?? "Authentication error";
      const code    = err.body?.code;
      const status  = err.status ?? 400;

      // Explicit conflict guard (email taken)
      if (
        status === 409 ||
        code === "USER_ALREADY_EXISTS" ||
        message.toLowerCase().includes("already") ||
        (err instanceof Error && err.message.includes("UNIQUE"))
      ) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 },
        );
      }

      logger.warn({ err, code, status }, "Better Auth rejected sign-up");
      return NextResponse.json({ error: message }, { status });
    }

    // Unexpected / infrastructure error
    logger.error({ err }, "Unexpected error during sign-up");
    return NextResponse.json(
      { error: "Registration failed. Please try again later." },
      { status: 500 },
    );
  }

  // ── 3. Guard against silent DB failures ─────────────────────────────────────
  if (!result?.user?.id) {
    logger.error({ result }, "sign-up returned no user ID — possible DB issue");
    return NextResponse.json(
      { error: "Registration failed. Please try again later." },
      { status: 500 },
    );
  }

  // ── 4. Success ───────────────────────────────────────────────────────────────
  logger.info({ userId: result.user.id, email }, "User registered");
  return NextResponse.json({ ok: true, userId: result.user.id });
}