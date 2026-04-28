import { authClient } from "../../../shared/lib/auth/client";
import type { InitialLogs, UserRow } from "../components/shared/types";

export async function setServiceEnabled(enabled: boolean): Promise<void> {
  const res = await fetch("/api/admin/service-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ serviceEnabled: enabled }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Request failed");
  }
}

export function banUser(userId: string) {
  return authClient.admin.banUser({ userId, banReason: "Admin action" });
}

export function unbanUser(userId: string) {
  return authClient.admin.unbanUser({ userId });
}

export async function toggleUserBan(u: UserRow) {
  return u.banned ? unbanUser(u.id) : banUser(u.id);
}

export function setUserRole(userId: string, role: "admin" | "user") {
  return authClient.admin.setRole({ userId, role });
}

export function removeUser(userId: string) {
  return authClient.admin.removeUser({ userId });
}

export async function fetchAgentLogs(agentId: string, limit = 500): Promise<InitialLogs> {
  const res = await fetch(`/api/admin/agents/${agentId}/logs?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}
