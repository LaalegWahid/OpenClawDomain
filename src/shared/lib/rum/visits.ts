import { GetAppMonitorDataCommand } from "@aws-sdk/client-rum";
import { rumClient, RUM_APP_MONITOR_NAME } from "./client";

// ---------- public types ----------

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

// ---------- raw RUM payload shapes ----------

interface RawRumEvent {
  event_timestamp?: number | string;
  event_details?: unknown;
  user_details?: unknown;
  metadata?: unknown;
}

interface ParsedMeta {
  url?: string;
  pageId?: string;
  domain?: string;
  referrer?: string;
  referrerUrl?: string;
  referrerDomain?: string;
  deviceType?: string;
  browserName?: string;
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

/** Flat, parsed page-view — built once per raw event and used everywhere. */
interface Visit {
  ts: number;
  sessionId: string;
  pageId: string;
  url: string;
  referrer: string | null;
  deviceType: string | null;
  browserName: string | null;
  country: string | null;
  subdivision: string | null;
  city: string | null;
}

// ---------- constants ----------

const DAY_MS = 24 * 60 * 60 * 1000;
const VISIT_BUCKET_MS = 30 * 60 * 1000;
const MAX_PAGES = 50;
const MAX_RECENT = 50;

// ---------- helpers ----------

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

function normalize(raw: RawRumEvent): Visit | null {
  const ts = Number(raw.event_timestamp);
  if (!Number.isFinite(ts)) return null;

  const meta = safeParse<ParsedMeta>(raw.metadata);
  const user = safeParse<ParsedUser>(raw.user_details);
  const details = safeParse<ParsedDetails>(raw.event_details);

  const pageId = details.pageId ?? meta.pageId ?? "";
  const fallbackUrl =
    meta.domain && pageId
      ? `https://${meta.domain}${pageId.startsWith("/") ? pageId : `/${pageId}`}`
      : "";

  return {
    ts,
    sessionId: user.sessionId ?? "",
    pageId,
    url: meta.url || details.url || details.pageUrl || fallbackUrl || pageId,
    referrer:
      meta.referrer ??
      meta.referrerUrl ??
      details.referrerUrl ??
      details.referrer ??
      meta.referrerDomain ??
      details.referrerDomain ??
      null,
    deviceType: user.deviceType ?? meta.deviceType ?? null,
    browserName: user.browserName ?? meta.browserName ?? null,
    country: meta.countryName ?? meta.country ?? meta.countryCode ?? null,
    subdivision:
      meta.subdivisionName ?? meta.subdivision ?? meta.subdivisionCode ?? null,
    city: meta.cityName ?? meta.city ?? null,
  };
}

// RUM emits a page_view_event on every route/hash/query change, so one real
// visit can produce many events. Collapse to one per session+page per 30-min
// window, keeping the earliest timestamp as canonical.
function dedupe(visits: Visit[]): Visit[] {
  const byKey = new Map<string, Visit>();
  visits.forEach((v, i) => {
    const bucket = Math.floor(v.ts / VISIT_BUCKET_MS);
    const key =
      v.sessionId && v.pageId
        ? `${v.sessionId}|${v.pageId}|${bucket}`
        : `__raw__|${v.ts}|${i}`;
    const existing = byKey.get(key);
    if (!existing || v.ts < existing.ts) byKey.set(key, v);
  });
  return [...byKey.values()];
}

async function fetchPageViews(after: number, before: number): Promise<RawRumEvent[]> {
  const events: RawRumEvent[] = [];
  let nextToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await rumClient.send(
      new GetAppMonitorDataCommand({
        Name: RUM_APP_MONITOR_NAME,
        TimeRange: { After: after, Before: before },
        Filters: [
          { Name: "event_type", Values: ["com.amazon.rum.page_view_event"] },
        ],
        NextToken: nextToken,
      }),
    );

    for (const raw of res.Events ?? []) {
      try {
        events.push(JSON.parse(raw) as RawRumEvent);
      } catch {
        /* ignore malformed */
      }
    }

    nextToken = res.NextToken;
    if (!nextToken) break;
  }

  return events;
}

function emptyDailyMap(now: number, days: number): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    map.set(dayKey(now - i * DAY_MS), 0);
  }
  return map;
}

function toDailyVisits(map: Map<string, number>): DailyVisit[] {
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ day, count }));
}

function toRecentVisit(v: Visit): RecentVisit {
  return {
    timestamp: new Date(v.ts).toISOString(),
    url: v.url,
    pageId: v.pageId,
    referrer: v.referrer,
    sessionId: v.sessionId,
    deviceType: v.deviceType,
    browserName: v.browserName,
    country: v.country,
    subdivision: v.subdivision,
    city: v.city,
  };
}

// ---------- main ----------

export async function getVisitStats(days = 30): Promise<VisitStats> {
  const now = Date.now();
  const after = now - days * DAY_MS;
  const dailyMap = emptyDailyMap(now, days);

  try {
    const raw = await fetchPageViews(after, now);
    const visits = dedupe(
      raw.map(normalize).filter((v): v is Visit => v !== null),
    );

    const sessionIds = new Set<string>();
    for (const v of visits) {
      const key = dayKey(v.ts);
      if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
      if (v.sessionId) sessionIds.add(v.sessionId);
    }

    const recent = [...visits]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, MAX_RECENT)
      .map(toRecentVisit);

    return {
      totalVisits: visits.length,
      uniqueSessions: sessionIds.size,
      dailyVisits: toDailyVisits(dailyMap),
      recent,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch RUM data";
    console.error("[rum] getVisitStats failed:", message);
    return {
      totalVisits: 0,
      uniqueSessions: 0,
      dailyVisits: toDailyVisits(dailyMap),
      recent: [],
      error: message,
    };
  }
}
