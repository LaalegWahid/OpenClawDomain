"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Bot,
  ShieldCheck,
  Activity as ActivityIcon,
  Power,
  Search,
  Ban,
  CheckCircle2,
  Trash2,
  ShieldOff,
  Shield,
  MessageSquare,
  Star,
  TrendingUp,
  Eye,
  Globe,
  AlertCircle,
  Terminal,
} from "lucide-react";
import { authClient } from "../../../shared/lib/auth/client";

// ── Landing palette (matches agent-detail-content) ───────────────────────────
const BG = "#f8f2ed";
const INK = "#2a1f19";
const MUTED = "#6b5d52";
const CARD = "#fbf6f1";
const BORDER = "rgba(42,31,25,0.12)";
const ACCENT = "#FF4D00";
const ACCENT_GLOW = "0 8px 25px rgba(255,77,0,0.18)";

const pageStyles = `
  @keyframes oc-fade-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .oc-page-section { animation: oc-fade-up 0.5s ease both; }
  .oc-card { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
  .oc-stat:hover { transform: translateY(-2px); border-color: rgba(255,77,0,0.35); }
  .oc-btn-primary { transition: transform 0.18s ease, box-shadow 0.18s ease; }
  .oc-btn-primary:hover { transform: translateY(-1px); box-shadow: ${ACCENT_GLOW}; }
  .oc-row:hover { background: rgba(42,31,25,0.03); }
  .oc-agent-link { transition: border-color 0.15s ease, color 0.15s ease; }
  a:hover .oc-agent-link { border-bottom-color: ${ACCENT}; color: ${ACCENT}; }
`;

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  createdAt: string;
  agentCount: number;
}

interface AgentRow {
  id: string;
  name: string;
  botUsername: string;
  status: string;
  type: string;
  isPrimary: boolean;
  containerId: string | null;
  apiProvider: string | null;
  agentModel: string | null;
  openclawAgentId: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
}

interface SeriesPoint {
  day: string;
  count: number;
}

interface FeedbackRow {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  agentId: string | null;
  agentName: string | null;
  userEmail: string | null;
  userName: string | null;
}

interface RecentVisit {
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

interface VisitStats {
  totalVisits: number;
  uniqueSessions: number;
  dailyVisits: SeriesPoint[];
  recent: RecentVisit[];
  error: string | null;
}

interface AdminContentProps {
  initialEnabled: boolean;
  stats: {
    totalUsers: number;
    totalAgents: number;
    activeAgents: number;
    adminCount: number;
  };
  users: UserRow[];
  agents: AgentRow[];
  userGrowth: SeriesPoint[];
  agentActivity: SeriesPoint[];
  feedback: FeedbackRow[];
  avgRating: number;
  visits: VisitStats;
}

export function AdminContent({
  initialEnabled,
  stats,
  users: initialUsers,
  agents: initialAgents,
  userGrowth,
  agentActivity,
  feedback,
  avgRating,
  visits,
}: AdminContentProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceSaved, setServiceSaved] = useState(false);

  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [agents] = useState<AgentRow[]>(initialAgents);
  const [agentQuery, setAgentQuery] = useState("");
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function toggleService() {
    setLoading(true);
    setServiceError(null);
    setServiceSaved(false);
    try {
      const res = await fetch("/api/admin/service-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceEnabled: !enabled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      setEnabled((v) => !v);
      setServiceSaved(true);
      setTimeout(() => setServiceSaved(false), 2500);
    } catch (err) {
      setServiceError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function toggleBan(u: UserRow) {
    setPendingId(u.id);
    setRowError(null);
    try {
      if (u.banned) {
        await authClient.admin.unbanUser({ userId: u.id });
      } else {
        await authClient.admin.banUser({ userId: u.id, banReason: "Admin action" });
      }
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, banned: !u.banned } : x)));
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setPendingId(null);
    }
  }

  async function toggleRole(u: UserRow) {
    setPendingId(u.id);
    setRowError(null);
    const nextRole = u.role === "admin" ? "user" : "admin";
    try {
      await authClient.admin.setRole({ userId: u.id, role: nextRole as "admin" | "user" });
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role: nextRole } : x)));
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setPendingId(null);
    }
  }

  async function removeUser(u: UserRow) {
    if (!confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    setPendingId(u.id);
    setRowError(null);
    try {
      await authClient.admin.removeUser({ userId: u.id });
      setUsers((list) => list.filter((x) => x.id !== u.id));
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setPendingId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q),
    );
  }, [users, query]);

  const filteredAgents = useMemo(() => {
    const q = agentQuery.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.botUsername.toLowerCase().includes(q) ||
        (a.ownerEmail ?? "").toLowerCase().includes(q) ||
        (a.agentModel ?? "").toLowerCase().includes(q),
    );
  }, [agents, agentQuery]);

  function statusColor(status: string) {
    if (status === "active") return "#4CAF50";
    if (status === "starting") return "#d98f2b";
    if (status === "error") return "#c83426";
    return MUTED;
  }

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: <Users size={14} /> },
    { label: "Total Agents", value: stats.totalAgents, icon: <Bot size={14} /> },
    { label: "Active Agents", value: stats.activeAgents, icon: <ActivityIcon size={14} /> },
    { label: "Admins", value: stats.adminCount, icon: <ShieldCheck size={14} /> },
  ];

  return (
    <>
      <style>{pageStyles}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, color: INK }}>
        {/* Header */}
        <div className="oc-page-section">
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            <em>Admin</em>
          </h1>
          <p style={{ margin: "6px 0 0", color: MUTED, fontSize: 14 }}>
            Platform overview, user management, and service controls.
          </p>
        </div>

        {/* Stats row */}
        <div
          className="oc-page-section"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
            gap: 12,
          }}
        >
          {statCards.map((s) => (
            <div
              key={s.label}
              className="oc-stat oc-card"
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: MUTED,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {s.icon} {s.label}
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 600, marginTop: 4 }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Service Control Card */}
        <Card title="Service Control" icon={<Power size={16} />}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: enabled ? "#4CAF50" : ACCENT,
                  boxShadow: enabled
                    ? "0 0 0 3px rgba(76,175,80,0.18)"
                    : "0 0 0 3px rgba(255,77,0,0.18)",
                }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {enabled ? "Service Active" : "Service Blocked"}
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                  {enabled
                    ? "Telegram messages are forwarded to the AI container."
                    : "All incoming messages dropped — no tokens consumed."}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {serviceSaved && <span style={{ fontSize: 12, color: "#4CAF50" }}>Saved</span>}
              {serviceError && <span style={{ fontSize: 12, color: "#c83426" }}>{serviceError}</span>}
              <button
                onClick={toggleService}
                disabled={loading}
                className="oc-btn-primary"
                style={{
                  background: enabled ? "transparent" : ACCENT,
                  color: enabled ? ACCENT : "#fff",
                  border: enabled ? `1px solid ${ACCENT}` : "none",
                  borderRadius: 10,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Saving…" : enabled ? "Block Service" : "Enable Service"}
              </button>
            </div>
          </div>
        </Card>

        {/* Users table */}
        <Card
          title="Users"
          icon={<Users size={16} />}
          action={
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(42,31,25,0.04)",
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "6px 10px",
              }}
            >
              <Search size={13} color={MUTED} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search email or name"
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 12,
                  color: INK,
                  width: 200,
                }}
              />
            </div>
          }
        >
          {rowError && (
            <div
              style={{
                marginBottom: 10,
                fontSize: 12,
                color: "#c83426",
                background: "rgba(200,52,38,0.08)",
                border: "1px solid rgba(200,52,38,0.25)",
                borderRadius: 8,
                padding: "6px 10px",
              }}
            >
              {rowError}
            </div>
          )}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: MUTED }}>
                  {["User", "Role", "Agents", "Status", "Joined", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        padding: "10px 12px",
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="oc-row" style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: 600 }}>{u.name || "—"}</div>
                      <div style={{ fontSize: 12, color: MUTED }}>{u.email}</div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 999,
                          background:
                            u.role === "admin" ? "rgba(255,77,0,0.1)" : "rgba(42,31,25,0.06)",
                          color: u.role === "admin" ? ACCENT : MUTED,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {u.role === "admin" ? <ShieldCheck size={11} /> : null}
                        {u.role ?? "user"}
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontFamily: "var(--serif)", fontSize: 16, fontWeight: 600 }}>
                      {u.agentCount}
                    </td>
                    <td style={{ padding: "12px" }}>
                      {u.banned ? (
                        <span style={{ color: "#c83426", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}>
                          <Ban size={12} /> Banned
                        </span>
                      ) : (
                        <span style={{ color: "#4CAF50", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}>
                          <CheckCircle2 size={12} /> Active
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px", color: MUTED, fontSize: 12 }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <IconAction
                          title={u.role === "admin" ? "Demote to user" : "Promote to admin"}
                          disabled={pendingId === u.id}
                          onClick={() => toggleRole(u)}
                        >
                          {u.role === "admin" ? <ShieldOff size={14} /> : <Shield size={14} />}
                        </IconAction>
                        <IconAction
                          title={u.banned ? "Unban" : "Ban"}
                          disabled={pendingId === u.id}
                          onClick={() => toggleBan(u)}
                          danger={!u.banned}
                        >
                          {u.banned ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                        </IconAction>
                        <IconAction
                          title="Delete user"
                          disabled={pendingId === u.id}
                          onClick={() => removeUser(u)}
                          danger
                        >
                          <Trash2 size={14} />
                        </IconAction>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: "28px 12px", textAlign: "center", color: MUTED, fontSize: 13 }}>
                      No users match this search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Charts row */}
        <div
          className="oc-page-section"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
            gap: 16,
          }}
        >
          <Card title="User Growth" icon={<TrendingUp size={16} />} action={<SeriesLabel total={userGrowth.reduce((s, p) => s + p.count, 0)} suffix="new · 30d" />}>
            <LineChart data={userGrowth} color={ACCENT} fill="rgba(255,77,0,0.12)" />
          </Card>
          <Card title="Agent Activity" icon={<ActivityIcon size={16} />} action={<SeriesLabel total={agentActivity.reduce((s, p) => s + p.count, 0)} suffix="msgs · 30d" />}>
            <BarChart data={agentActivity} color="#2a1f19" />
          </Card>
        </div>

        {/* Site Visits (AWS CloudWatch RUM) */}
        <Card
          title="Site Visits"
          icon={<Eye size={16} />}
          action={
            <div style={{ display: "inline-flex", alignItems: "center", gap: 14, fontSize: 12, color: MUTED }}>
              <span>
                <span style={{ fontWeight: 700, color: INK, fontFamily: "var(--serif)", fontSize: 16 }}>
                  {visits.totalVisits}
                </span>{" "}
                views
              </span>
              <span>
                <span style={{ fontWeight: 700, color: INK, fontFamily: "var(--serif)", fontSize: 16 }}>
                  {visits.uniqueSessions}
                </span>{" "}
                sessions · 30d
              </span>
            </div>
          }
        >
          {visits.error && (
            <div
              style={{
                marginBottom: 12,
                fontSize: 12,
                color: "#c83426",
                background: "rgba(200,52,38,0.08)",
                border: "1px solid rgba(200,52,38,0.25)",
                borderRadius: 8,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertCircle size={14} />
              {visits.error}
            </div>
          )}

          <LineChart data={visits.dailyVisits} color="#2a1f19" fill="rgba(42,31,25,0.08)" />

          <div style={{ marginTop: 16 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: MUTED,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: 8,
              }}
            >
              Recent Visits
            </div>
            {visits.recent.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: MUTED, fontSize: 13 }}>
                No visits recorded yet.
              </div>
            ) : (
              <div style={{ overflowX: "auto", maxHeight: 360, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: MUTED, position: "sticky", top: 0, background: CARD }}>
                      {["When", "Page", "Location", "Referrer", "Device", "Session"].map((h) => (
                        <th
                          key={h}
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            padding: "8px 12px",
                            borderBottom: `1px solid ${BORDER}`,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visits.recent.map((v, i) => (
                      <tr key={`${v.sessionId}-${v.timestamp}-${i}`} className="oc-row" style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <td style={{ padding: "10px 12px", color: MUTED, whiteSpace: "nowrap" }}>
                          {new Date(v.timestamp).toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            maxWidth: 320,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={v.url || v.pageId}
                        >
                          <span style={{ fontFamily: "monospace" }}>{v.pageId || v.url || "—"}</span>
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            color: MUTED,
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={formatLocation(v) || "Unknown"}
                        >
                          {formatLocation(v) || "—"}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            color: MUTED,
                            maxWidth: 220,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={v.referrer ?? ""}
                        >
                          {v.referrer ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <Globe size={11} /> {shortenReferrer(v.referrer)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ padding: "10px 12px", color: MUTED, whiteSpace: "nowrap" }}>
                          {[v.deviceType, v.browserName].filter(Boolean).join(" · ") || "—"}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            color: MUTED,
                            fontFamily: "monospace",
                            fontSize: 11,
                          }}
                          title={v.sessionId}
                        >
                          {v.sessionId ? v.sessionId.slice(0, 8) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        {/* Feedback */}
        <Card
          title="Feedback"
          icon={<MessageSquare size={16} />}
          action={
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUTED, fontSize: 12 }}>
              <Star size={13} fill="#FFB400" stroke="#FFB400" />
              <span style={{ fontWeight: 600, color: INK }}>
                {avgRating > 0 ? avgRating.toFixed(1) : "—"}
              </span>
              <span>({feedback.length})</span>
            </div>
          }
        >
          {feedback.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: MUTED, fontSize: 13 }}>
              No feedback submitted yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 420, overflowY: "auto" }}>
              {feedback.map((f) => (
                <div
                  key={f.id}
                  style={{
                    border: `1px solid ${BORDER}`,
                    borderRadius: 10,
                    padding: "12px 14px",
                    background: "rgba(42,31,25,0.02)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            size={13}
                            fill={n <= f.rating ? "#FFB400" : "transparent"}
                            stroke={n <= f.rating ? "#FFB400" : MUTED}
                            strokeWidth={1.5}
                          />
                        ))}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                        {f.userName ?? "Unknown user"}
                        <span style={{ color: MUTED, fontWeight: 400 }}> · {f.userEmail ?? "—"}</span>
                      </div>
                      {f.agentName && (
                        <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                          Agent: <span style={{ color: INK }}>{f.agentName}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: MUTED, whiteSpace: "nowrap" }}>
                      {new Date(f.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {f.comment && (
                    <p style={{ margin: "10px 0 0", fontSize: 13, color: INK, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {f.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Agents table */}
        <Card
          title="Agents"
          icon={<Bot size={16} />}
          action={
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(42,31,25,0.04)",
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "6px 10px",
              }}
            >
              <Search size={13} color={MUTED} />
              <input
                value={agentQuery}
                onChange={(e) => setAgentQuery(e.target.value)}
                placeholder="Search name, bot, owner, model"
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 12,
                  color: INK,
                  width: 220,
                }}
              />
            </div>
          }
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: MUTED }}>
                  {[
                    "Agent",
                    "Owner",
                    "Type",
                    "Status",
                    "Provider",
                    "Model",
                    "Container",
                    "Created",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        padding: "10px 12px",
                        borderBottom: `1px solid ${BORDER}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((a) => (
                  <tr key={a.id} className="oc-row" style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "12px" }}>
                      <Link
                        href={`/admin/agents/${a.id}/logs`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontWeight: 600,
                          color: INK,
                          textDecoration: "none",
                        }}
                      >
                        <span style={{ borderBottom: "1px dashed transparent" }} className="oc-agent-link">
                          {a.name}
                        </span>
                        {a.isPrimary && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 999,
                              background: "rgba(255,77,0,0.1)",
                              color: ACCENT,
                              letterSpacing: "0.04em",
                            }}
                          >
                            PRIMARY
                          </span>
                        )}
                      </Link>
                      <div style={{ fontSize: 12, color: MUTED }}>@{a.botUsername}</div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontSize: 13 }}>{a.ownerName ?? "—"}</div>
                      <div style={{ fontSize: 12, color: MUTED }}>{a.ownerEmail ?? "—"}</div>
                    </td>
                    <td style={{ padding: "12px", color: MUTED, fontSize: 12, textTransform: "capitalize" }}>
                      {a.type}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          color: statusColor(a.status),
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: statusColor(a.status),
                            display: "inline-block",
                          }}
                        />
                        {a.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px", color: MUTED, fontSize: 12 }}>
                      {a.apiProvider ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        color: MUTED,
                        fontSize: 12,
                        fontFamily: "monospace",
                        maxWidth: 180,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={a.agentModel ?? ""}
                    >
                      {a.agentModel ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        color: MUTED,
                        fontSize: 11,
                        fontFamily: "monospace",
                        maxWidth: 140,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={a.containerId ?? ""}
                    >
                      {a.containerId ? a.containerId.slice(0, 12) : "—"}
                    </td>
                    <td style={{ padding: "12px", color: MUTED, fontSize: 12, whiteSpace: "nowrap" }}>
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <Link
                        href={`/admin/agents/${a.id}/logs`}
                        title="View ECS logs"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          color: MUTED,
                          border: `1px solid ${BORDER}`,
                          borderRadius: 8,
                          padding: "6px 10px",
                          textDecoration: "none",
                        }}
                      >
                        <Terminal size={13} /> Logs
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredAgents.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: "28px 12px", textAlign: "center", color: MUTED, fontSize: 13 }}>
                      No agents match this search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

function Card({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="oc-page-section oc-card"
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: INK }}>
          {icon}
          <h3 style={{ fontFamily: "var(--serif)", fontSize: 16, margin: 0, fontWeight: 600 }}>
            <em>{title}</em>
          </h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function SeriesLabel({ total, suffix }: { total: number; suffix: string }) {
  return (
    <div style={{ fontSize: 12, color: MUTED }}>
      <span style={{ fontWeight: 700, color: INK, fontFamily: "var(--serif)", fontSize: 16 }}>{total}</span>{" "}
      {suffix}
    </div>
  );
}

function LineChart({ data, color, fill }: { data: SeriesPoint[]; color: string; fill: string }) {
  const W = 600;
  const H = 140;
  const PAD = 8;
  if (data.length === 0) {
    return <div style={{ padding: "30px 0", textAlign: "center", color: MUTED, fontSize: 13 }}>No data</div>;
  }
  const max = Math.max(1, ...data.map((d) => d.count));
  const step = data.length > 1 ? (W - PAD * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = PAD + i * step;
    const y = H - PAD - (d.count / max) * (H - PAD * 2);
    return { x, y, d };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L${points[points.length - 1].x.toFixed(1)},${H - PAD} L${points[0].x.toFixed(1)},${H - PAD} Z`;
  return (
    <div style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        <path d={area} fill={fill} />
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p) =>
          p.d.count > 0 ? <circle key={p.d.day} cx={p.x} cy={p.y} r={2.5} fill={color} /> : null,
        )}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTED, marginTop: 4 }}>
        <span>{formatDay(data[0].day)}</span>
        <span>{formatDay(data[data.length - 1].day)}</span>
      </div>
    </div>
  );
}

function BarChart({ data, color }: { data: SeriesPoint[]; color: string }) {
  const W = 600;
  const H = 140;
  const PAD = 8;
  if (data.length === 0) {
    return <div style={{ padding: "30px 0", textAlign: "center", color: MUTED, fontSize: 13 }}>No data</div>;
  }
  const max = Math.max(1, ...data.map((d) => d.count));
  const bw = (W - PAD * 2) / data.length;
  return (
    <div style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = (d.count / max) * (H - PAD * 2);
          const x = PAD + i * bw + bw * 0.15;
          const y = H - PAD - h;
          return (
            <rect
              key={d.day}
              x={x}
              y={y}
              width={bw * 0.7}
              height={Math.max(h, d.count > 0 ? 1 : 0)}
              fill={color}
              opacity={0.85}
              rx={1.5}
            />
          );
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTED, marginTop: 4 }}>
        <span>{formatDay(data[0].day)}</span>
        <span>{formatDay(data[data.length - 1].day)}</span>
      </div>
    </div>
  );
}

const countryNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

function countryLabel(code: string | null): string | null {
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

function formatLocation(v: {
  country: string | null;
  subdivision: string | null;
  city: string | null;
}): string {
  const parts = [v.city, v.subdivision, countryLabel(v.country)];
  return parts.filter((p): p is string => Boolean(p && p.trim())).join(", ");
}

function shortenReferrer(ref: string): string {
  try {
    const u = new URL(ref);
    return u.hostname.replace(/^www\./, "") + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return ref;
  }
}

function formatDay(d: string) {
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function IconAction({
  onClick,
  disabled,
  title,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: "transparent",
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: "6px 8px",
        cursor: disabled ? "not-allowed" : "pointer",
        color: danger ? "#c83426" : MUTED,
        opacity: disabled ? 0.5 : 1,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {children}
    </button>
  );
}
