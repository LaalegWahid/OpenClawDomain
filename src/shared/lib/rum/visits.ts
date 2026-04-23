import { GetAppMonitorDataCommand } from "@aws-sdk/client-rum";
import { rumClient, RUM_APP_MONITOR_NAME } from "./client";

export interface DailyVisit {
  day: string;
  count: number;
}

export interface RecentVisit {
  timestamp: string;
  url: string;
  pageId: string;
  referrer: string | null;
  sessionId: string;
  deviceType: string | null;
  browserName: string | null;
  country: string | null;
  subdivision: string | null;
  city: string | null;
}

export interface VisitStats {
  totalVisits: number;
  uniqueSessions: number;
  dailyVisits: DailyVisit[];
  recent: RecentVisit[];
  error: string | null;
}

interface RawRumEvent {
  event_timestamp?: number | string;
  event_type?: string;
  event_details?: unknown;
  user_details?: unknown;
  metadata?: unknown;
}

interface ParsedMeta {
  url?: string;
  pageId?: string;
  title?: string;
  domain?: string;
  referrer?: string;
  referrerUrl?: string;
  referrerDomain?: string;
  deviceType?: string;
  browserName?: string;
  osName?: string;
  country?: string;
  countryCode?: string;
  countryName?: string;
  subdivision?: string;
  subdivisionCode?: string;
  subdivisionName?: string;
  city?: string;
  cityName?: string;
}

interface ParsedUser {
  sessionId?: string;
  userId?: string;
  deviceType?: string;
  browserName?: string;
}

interface ParsedDetails {
  pageId?: string;
  url?: string;
  pageUrl?: string;
  referrerUrl?: string;
  referrerDomain?: string;
  referrer?: string;
}

function safeParse<T>(raw: unknown): T {
  if (!raw) return {} as T;
  if (typeof raw === "object") return raw as T;
  if (typeof raw !== "string") return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return {} as T;
  }
}

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export async function getVisitStats(days = 30): Promise<VisitStats> {
  const now = Date.now();
  const after = now - days * 24 * 60 * 60 * 1000;

  const dailyMap = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    dailyMap.set(dayKey(now - i * 24 * 60 * 60 * 1000), 0);
  }

  try {
    const events: RawRumEvent[] = [];
    let nextToken: string | undefined;
    const MAX_PAGES = 50;

    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await rumClient.send(
        new GetAppMonitorDataCommand({
          Name: RUM_APP_MONITOR_NAME,
          TimeRange: { After: after, Before: now },
          Filters: [
            { Name: "event_type", Values: ["com.amazon.rum.page_view_event"] },
          ],
          NextToken: nextToken,
        }),
      );

      for (const raw of res.Events ?? []) {
        try {
          const parsed = JSON.parse(raw) as RawRumEvent;
          events.push(parsed);
        } catch {
          /* ignore malformed */
        }
      }
      if (page === 0 && (res.Events?.length ?? 0) > 0) {
        console.log("[rum] sample raw event:", res.Events?.[0]);
        console.log("[rum] sample parsed event:", events[0]);
      }

      nextToken = res.NextToken;
      if (!nextToken) break;
    }

    const sessionIds = new Set<string>();

    for (const e of events) {
      const ts = Number(e.event_timestamp);
      if (!Number.isFinite(ts)) continue;
      const key = dayKey(ts);
      if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);

      const user = safeParse<ParsedUser>(e.user_details);
      if (user.sessionId) sessionIds.add(user.sessionId);
    }

    const recent: RecentVisit[] = [...events]
      .sort((a, b) => Number(b.event_timestamp) - Number(a.event_timestamp))
      .slice(0, 50)
      .map((e) => {
        const meta = safeParse<ParsedMeta>(e.metadata);
        const user = safeParse<ParsedUser>(e.user_details);
        const details = safeParse<ParsedDetails>(e.event_details);
        const pageId = details.pageId ?? meta.pageId ?? "";
        const constructedUrl =
          meta.domain && pageId
            ? `https://${meta.domain}${pageId.startsWith("/") ? pageId : `/${pageId}`}`
            : "";
        const url =
          meta.url ||
          details.url ||
          details.pageUrl ||
          constructedUrl ||
          pageId;
        const referrer =
          meta.referrer ??
          meta.referrerUrl ??
          details.referrerUrl ??
          details.referrer ??
          meta.referrerDomain ??
          details.referrerDomain ??
          null;
        return {
          timestamp: new Date(Number(e.event_timestamp)).toISOString(),
          url,
          pageId,
          referrer,
          sessionId: user.sessionId ?? "",
          deviceType: user.deviceType ?? meta.deviceType ?? null,
          browserName: user.browserName ?? meta.browserName ?? null,
          country: meta.countryName ?? meta.country ?? meta.countryCode ?? null,
          subdivision: meta.subdivisionName ?? meta.subdivision ?? meta.subdivisionCode ?? null,
          city: meta.cityName ?? meta.city ?? null,
        };
      });

    const dailyVisits: DailyVisit[] = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({ day, count }));

    return {
      totalVisits: events.length,
      uniqueSessions: sessionIds.size,
      dailyVisits,
      recent,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch RUM data";
    console.error("[rum] getVisitStats failed:", message);
    return {
      totalVisits: 0,
      uniqueSessions: 0,
      dailyVisits: Array.from(dailyMap.entries()).map(([day, count]) => ({ day, count })),
      recent: [],
      error: message,
    };
  }
}
