import type { LogEntry, Stats } from "../components/shared/types";

export async function fetchMonitorData(): Promise<{ logs: LogEntry[]; stats: Stats } | null> {
  const res = await fetch("/api/monitor");
  if (!res.ok) return null;
  return res.json();
}

export async function abortLog(logId: string): Promise<void> {
  await fetch("/api/monitor/abort", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ logId }),
  });
}
