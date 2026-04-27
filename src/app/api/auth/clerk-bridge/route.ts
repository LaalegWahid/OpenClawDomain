import { NextRequest, NextResponse } from "next/server";
import { verifyToken, createClerkClient } from "@clerk/nextjs/server";
import { makeSignature } from "better-auth/crypto";
import { auth } from "@/shared/lib/auth/server";

export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "no_token" }, { status: 401 });
  }

  let payload;
  try {
    payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
      clockSkewInMs: 60_000,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.log("[clerk-bridge] verify failed:", detail);
    return NextResponse.json({ error: "verify_failed", detail }, { status: 401 });
  }

  const clerkUserId = payload.sub;
  if (!clerkUserId) {
    return NextResponse.json({ error: "no_sub" }, { status: 401 });
  }

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const clerkUser = await clerk.users.getUser(clerkUserId);
  const email = clerkUser.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "no_email" }, { status: 400 });
  }

  const ctx = await auth.$context;

  let userRecord = (await ctx.internalAdapter.findUserByEmail(email))?.user;

  if (!userRecord) {
    userRecord = await ctx.internalAdapter.createUser({
      name: clerkUser.fullName ?? email.split("@")[0],
      email,
      emailVerified: true,
      image: clerkUser.imageUrl ?? null,
    });
    const googleAccount = clerkUser.externalAccounts.find(
      (a: { provider: string; providerUserId: string }) => a.provider === "oauth_google",
    );
    await ctx.internalAdapter.linkAccount({
      userId: userRecord.id,
      providerId: "google",
      accountId: googleAccount?.providerUserId ?? clerkUserId,
    });
  }

  const session = await ctx.internalAdapter.createSession(userRecord.id, false);
  const signedToken = `${session.token}.${await makeSignature(session.token, ctx.secret)}`;

  const cookie = ctx.authCookies.sessionToken;
  console.log("[clerk-bridge] setting cookie", {
    name: cookie.name,
    attrs: cookie.attributes,
    tokenLen: signedToken.length,
    userId: userRecord.id,
  });

  const res = NextResponse.json({ ok: true, userId: userRecord.id, cookieName: cookie.name });
  res.cookies.set({
    name: cookie.name,
    value: signedToken,
    path: cookie.attributes.path ?? "/",
    httpOnly: cookie.attributes.httpOnly ?? true,
    secure: cookie.attributes.secure ?? false,
    sameSite: (cookie.attributes.sameSite as "lax" | "strict" | "none" | undefined) ?? "lax",
    maxAge: ctx.sessionConfig.expiresIn,
  });
  return res;
}
