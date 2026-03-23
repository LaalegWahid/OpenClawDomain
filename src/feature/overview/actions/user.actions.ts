import "server-only";
import { auth } from "../../../shared/lib/auth/server";
import { headers } from "next/headers";

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}
