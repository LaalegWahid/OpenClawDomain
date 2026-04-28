import { DANGER, LOG_FG, MUTED, SUCCESS, WARN } from "./constants";

const countryNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

export function countryLabel(code: string | null): string | null {
  if (!code) return null;
  const trimmed = code.trim();
  if (!trimmed) return null;
  if (trimmed.length === 2 && countryNames) {
    try {
      return countryNames.of(trimmed.toUpperCase()) ?? trimmed;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

export function formatLocation(v: {
  country: string | null;
  subdivision: string | null;
  city: string | null;
}): string {
  const parts = [v.city, v.subdivision, countryLabel(v.country)];
  return parts.filter((p): p is string => Boolean(p && p.trim())).join(", ");
}

export function shortenReferrer(ref: string): string {
  try {
    const u = new URL(ref);
    return u.hostname.replace(/^www\./, "") + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return ref;
  }
}

export function formatDay(d: string) {
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function agentStatusColor(status: string): string {
  if (status === "active") return SUCCESS;
  if (status === "starting") return WARN;
  if (status === "error") return DANGER;
  return MUTED;
}

export function formatLogTs(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${d.toLocaleDateString()} ${hh}:${mm}:${ss}.${ms}`;
}

export function logLineColor(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("error") || m.includes("fatal") || m.includes("exception")) return "#ff8b75";
  if (m.includes("warn")) return "#ffcb6b";
  if (m.includes("info")) return "#c3e88d";
  return LOG_FG;
}
