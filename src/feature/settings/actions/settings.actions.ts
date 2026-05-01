export function saveProfile(data: { name: string; email: string }) {
}

export function savePassword(data: {
  current: string;
  next: string;
  confirm: string;
}) {
}

export function saveAccount(data: { preferences: string }) {
}

export async function deleteAccount(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.error ?? "Account deletion failed." };
  } catch {
    return { ok: false, error: "Network error while deleting account." };
  }
}
