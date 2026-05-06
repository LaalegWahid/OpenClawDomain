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

export async function setDeveloperAccess(userId: string, developerAccess: boolean): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}/developer-access`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ developerAccess }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Request failed");
  }
}

export function removeUser(userId: string) {
  return authClient.admin.removeUser({ userId });
}

export interface AdminModel {
  id: string;
  provider: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchAdminModels(): Promise<AdminModel[]> {
  const res = await fetch("/api/admin/models", { cache: "no-store" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to load models");
  }
  const data = await res.json();
  return data.models ?? [];
}

export async function createAdminModel(payload: { provider: string; name: string }): Promise<AdminModel> {
  const res = await fetch("/api/admin/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Failed to add model");
  return data.model;
}

export async function importAdminModels(payload: {
  catalog: Record<string, string[]>;
  replace?: boolean;
}): Promise<{ inserted: number; models: AdminModel[] }> {
  const res = await fetch("/api/admin/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Failed to import models");
  return { inserted: data.inserted ?? 0, models: data.models ?? [] };
}

export async function updateAdminModel(
  id: string,
  payload: { provider?: string; name?: string },
): Promise<AdminModel> {
  const res = await fetch(`/api/admin/models/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Failed to update model");
  return data.model;
}

export async function deleteAdminModel(id: string): Promise<void> {
  const res = await fetch(`/api/admin/models/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to delete model");
  }
}

export async function fetchAgentLogs(agentId: string, limit = 500): Promise<InitialLogs> {
  const res = await fetch(`/api/admin/agents/${agentId}/logs?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}
