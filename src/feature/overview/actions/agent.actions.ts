import type { AgentRecord, UserSkill } from "../components/shared/types";

export async function fetchAgents(): Promise<AgentRecord[]> {
  const res = await fetch("/api/agents");
  if (!res.ok) return [];
  const data = await res.json();
  return data.agents ?? [];
}

export async function fetchHasCard(): Promise<boolean> {
  try {
    const res = await fetch("/api/stripe/payment-methods");
    if (!res.ok) return false;
    const data = await res.json();
    return (data.paymentMethods?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function fetchUserSkills(): Promise<UserSkill[]> {
  try {
    const res = await fetch("/api/skills");
    if (!res.ok) return [];
    const data = await res.json();
    return data.skills ?? [];
  } catch {
    return [];
  }
}

export async function fetchModelsCatalog(): Promise<Record<string, string[]>> {
  try {
    const res = await fetch("/models.json");
    return await res.json();
  } catch {
    return {};
  }
}

export type CreateAgentBody =
  | { platform: "telegram"; botToken: string; botUsername: string; [k: string]: unknown }
  | { platform: "discord"; credentials: { botToken: string }; [k: string]: unknown }
  | { platform: "whatsapp"; [k: string]: unknown };

export async function createAgent(body: CreateAgentBody) {
  const res = await fetch("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

export async function startWhatsAppLink(agentId: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/agents/${agentId}/whatsapp/link`, { method: "POST" });
  if (res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, error: data.error };
}

export async function pollWhatsAppLink(agentId: string): Promise<{ status?: string; qrData?: string }> {
  const res = await fetch(`/api/agents/${agentId}/whatsapp/link`);
  if (!res.ok) return {};
  return res.json();
}

export interface ReferralData {
  referralCode: string | null;
  referralCount: number;
  freeAgentCredits: number;
}

export async function fetchReferralData(): Promise<ReferralData> {
  try {
    const res = await fetch("/api/referral");
    if (!res.ok) return { referralCode: null, referralCount: 0, freeAgentCredits: 0 };
    return res.json();
  } catch {
    return { referralCode: null, referralCount: 0, freeAgentCredits: 0 };
  }
}

export async function submitAgentFeedback(payload: { rating: number; comment: string; agentId: string | null }) {
  await fetch("/api/feedback/agent-creation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
