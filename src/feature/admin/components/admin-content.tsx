"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Bot,
  ShieldCheck,
  Activity as ActivityIcon,
  Power,
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
  Code2,
  Brain,
} from "lucide-react";
import { ModelsManager } from "./models-manager";
import {
  removeUser as removeUserAction,
  setDeveloperAccess,
  setServiceEnabled,
  setUserRole,
  toggleUserBan,
} from "../actions/admin.actions";
import {
  ACCENT,
  AdminStyles,
  BarChart,
  BORDER,
  Card,
  CARD,
  DANGER,
  ErrorBanner,
  IconAction,
  INK,
  LineChart,
  MUTED,
  SUCCESS,
  SearchInput,
  SeriesLabel,
  agentStatusColor,
  formatLocation,
  shortenReferrer,
  type AgentRow,
  type FeedbackRow,
  type SeriesPoint,
  type UserRow,
  type VisitStats,
} from "./shared";

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
      await setServiceEnabled(!enabled);
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
      await toggleUserBan(u);
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
      await setUserRole(u.id, nextRole);
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role: nextRole } : x)));
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setPendingId(null);
    }
  }

  async function toggleDeveloperAccess(u: UserRow) {
    setPendingId(u.id);
    setRowError(null);
    const next = !u.developerAccess;
    try {
      await setDeveloperAccess(u.id, next);
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, developerAccess: next } : x)));
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
      await removeUserAction(u.id);
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

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: <Users size={14} /> },
    { label: "Total Agents", value: stats.totalAgents, icon: <Bot size={14} /> },
    { label: "Active Agents", value: stats.activeAgents, icon: <ActivityIcon size={14} /> },
    { label: "Admins", value: stats.adminCount, icon: <ShieldCheck size={14} /> },
  ];

  return (
    <>
      <AdminStyles />
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
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}
        >
          {statCards.map((s) => (
            <div
              key={s.label}
              className="oc-stat oc-card"
              style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 18px" }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: 6 }}>
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
          <ServiceControl
            enabled={enabled}
            loading={loading}
            saved={serviceSaved}
            error={serviceError}
            onToggle={toggleService}
          />
        </Card>

        {/* AI Models catalog */}
        <Card title="AI Models" icon={<Brain size={16} />}>
          <ModelsManager />
        </Card>

        {/* Users table */}
        <Card
          title="Users"
          icon={<Users size={16} />}
          action={<SearchInput value={query} onChange={setQuery} placeholder="Search email or name" />}
        >
          {rowError && <ErrorBanner message={rowError} />}
          <UsersTable
            users={filtered}
            pendingId={pendingId}
            onToggleRole={toggleRole}
            onToggleBan={toggleBan}
            onToggleDeveloperAccess={toggleDeveloperAccess}
            onRemove={removeUser}
          />
        </Card>

        {/* Charts row */}
        <div
          className="oc-page-section"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}
        >
          <Card
            title="User Growth"
            icon={<TrendingUp size={16} />}
            action={<SeriesLabel total={userGrowth.reduce((s, p) => s + p.count, 0)} suffix="new · 30d" />}
          >
            <LineChart data={userGrowth} color={ACCENT} fill="rgba(255,77,0,0.12)" />
          </Card>
          <Card
            title="Agent Activity"
            icon={<ActivityIcon size={16} />}
            action={<SeriesLabel total={agentActivity.reduce((s, p) => s + p.count, 0)} suffix="msgs · 30d" />}
          >
            <BarChart data={agentActivity} color="#2a1f19" />
          </Card>
        </div>

        {/* Site Visits */}
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
          <VisitsSection visits={visits} />
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
          <FeedbackList feedback={feedback} />
        </Card>

        {/* Agents table */}
        <Card
          title="Agents"
          icon={<Bot size={16} />}
          action={<SearchInput value={agentQuery} onChange={setAgentQuery} placeholder="Search name, bot, owner, model" width={220} />}
        >
          <AgentsTable agents={filteredAgents} />
        </Card>
      </div>
    </>
  );
}

function ServiceControl({
  enabled, loading, saved, error, onToggle,
}: {
  enabled: boolean;
  loading: boolean;
  saved: boolean;
  error: string | null;
  onToggle: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            display: "inline-block", width: 10, height: 10, borderRadius: "50%",
            background: enabled ? SUCCESS : ACCENT,
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
        {saved && <span style={{ fontSize: 12, color: SUCCESS }}>Saved</span>}
        {error && <span style={{ fontSize: 12, color: DANGER }}>{error}</span>}
        <button
          onClick={onToggle}
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
  );
}

function UsersTable({
  users, pendingId, onToggleRole, onToggleBan, onToggleDeveloperAccess, onRemove,
}: {
  users: UserRow[];
  pendingId: string | null;
  onToggleRole: (u: UserRow) => void;
  onToggleBan: (u: UserRow) => void;
  onToggleDeveloperAccess: (u: UserRow) => void;
  onRemove: (u: UserRow) => void;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", color: MUTED }}>
            {["User", "Role", "Agents", "Status", "Joined", ""].map((h) => (
              <th
                key={h}
                style={{
                  fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
                  padding: "10px 12px", borderBottom: `1px solid ${BORDER}`,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="oc-row" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <td style={{ padding: 12 }}>
                <div style={{ fontWeight: 600 }}>{u.name || "—"}</div>
                <div style={{ fontSize: 12, color: MUTED }}>{u.email}</div>
              </td>
              <td style={{ padding: 12 }}>
                <span
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999,
                    background: u.role === "admin" ? "rgba(255,77,0,0.1)" : "rgba(42,31,25,0.06)",
                    color: u.role === "admin" ? ACCENT : MUTED,
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}
                >
                  {u.role === "admin" ? <ShieldCheck size={11} /> : null}
                  {u.role ?? "user"}
                </span>
              </td>
              <td style={{ padding: 12, fontFamily: "var(--serif)", fontSize: 16, fontWeight: 600 }}>
                {u.agentCount}
              </td>
              <td style={{ padding: 12 }}>
                {u.banned ? (
                  <span style={{ color: DANGER, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}>
                    <Ban size={12} /> Banned
                  </span>
                ) : (
                  <span style={{ color: SUCCESS, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}>
                    <CheckCircle2 size={12} /> Active
                  </span>
                )}
              </td>
              <td style={{ padding: 12, color: MUTED, fontSize: 12 }}>
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
              <td style={{ padding: 12, textAlign: "right" }}>
                <div style={{ display: "inline-flex", gap: 6 }}>
                  <IconAction
                    title={u.role === "admin" ? "Demote to user" : "Promote to admin"}
                    disabled={pendingId === u.id}
                    onClick={() => onToggleRole(u)}
                  >
                    {u.role === "admin" ? <ShieldOff size={14} /> : <Shield size={14} />}
                  </IconAction>
                  <IconAction
                    title={u.developerAccess ? "Revoke developer access" : "Grant developer access"}
                    disabled={pendingId === u.id}
                    onClick={() => onToggleDeveloperAccess(u)}
                  >
                    <Code2 size={14} color={u.developerAccess ? ACCENT : undefined} />
                  </IconAction>
                  <IconAction
                    title={u.banned ? "Unban" : "Ban"}
                    disabled={pendingId === u.id}
                    onClick={() => onToggleBan(u)}
                    danger={!u.banned}
                  >
                    {u.banned ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                  </IconAction>
                  <IconAction
                    title="Delete user"
                    disabled={pendingId === u.id}
                    onClick={() => onRemove(u)}
                    danger
                  >
                    <Trash2 size={14} />
                  </IconAction>
                </div>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: "28px 12px", textAlign: "center", color: MUTED, fontSize: 13 }}>
                No users match this search.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AgentsTable({ agents }: { agents: AgentRow[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", color: MUTED }}>
            {["Agent", "Owner", "Type", "Status", "Provider", "Model", "Container", "Created", ""].map((h) => (
              <th
                key={h}
                style={{
                  fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
                  padding: "10px 12px", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {agents.map((a) => (
            <tr key={a.id} className="oc-row" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <td style={{ padding: 12 }}>
                <Link
                  href={`/admin/agents/${a.id}/logs`}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: INK, textDecoration: "none" }}
                >
                  <span style={{ borderBottom: "1px dashed transparent" }} className="oc-agent-link">
                    {a.name}
                  </span>
                  {a.isPrimary && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 999,
                      background: "rgba(255,77,0,0.1)", color: ACCENT, letterSpacing: "0.04em",
                    }}>
                      PRIMARY
                    </span>
                  )}
                </Link>
                <div style={{ fontSize: 12, color: MUTED }}>@{a.botUsername}</div>
              </td>
              <td style={{ padding: 12 }}>
                <div style={{ fontSize: 13 }}>{a.ownerName ?? "—"}</div>
                <div style={{ fontSize: 12, color: MUTED }}>{a.ownerEmail ?? "—"}</div>
              </td>
              <td style={{ padding: 12, color: MUTED, fontSize: 12, textTransform: "capitalize" }}>{a.type}</td>
              <td style={{ padding: 12 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: agentStatusColor(a.status) }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: agentStatusColor(a.status), display: "inline-block" }} />
                  {a.status}
                </span>
              </td>
              <td style={{ padding: 12, color: MUTED, fontSize: 12 }}>{a.apiProvider ?? "—"}</td>
              <td
                style={{
                  padding: 12, color: MUTED, fontSize: 12, fontFamily: "monospace",
                  maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
                title={a.agentModel ?? ""}
              >
                {a.agentModel ?? "—"}
              </td>
              <td
                style={{
                  padding: 12, color: MUTED, fontSize: 11, fontFamily: "monospace",
                  maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
                title={a.containerId ?? ""}
              >
                {a.containerId ? a.containerId.slice(0, 12) : "—"}
              </td>
              <td style={{ padding: 12, color: MUTED, fontSize: 12, whiteSpace: "nowrap" }}>
                {new Date(a.createdAt).toLocaleDateString()}
              </td>
              <td style={{ padding: 12, textAlign: "right" }}>
                <Link
                  href={`/admin/agents/${a.id}/logs`}
                  title="View ECS logs"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600,
                    color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px",
                    textDecoration: "none",
                  }}
                >
                  <Terminal size={13} /> Logs
                </Link>
              </td>
            </tr>
          ))}
          {agents.length === 0 && (
            <tr>
              <td colSpan={9} style={{ padding: "28px 12px", textAlign: "center", color: MUTED, fontSize: 13 }}>
                No agents match this search.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function VisitsSection({ visits }: { visits: VisitStats }) {
  return (
    <>
      {visits.error && (
        <div style={{
          marginBottom: 12, fontSize: 12, color: DANGER,
          background: "rgba(200,52,38,0.08)", border: "1px solid rgba(200,52,38,0.25)",
          borderRadius: 8, padding: "8px 12px",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <AlertCircle size={14} />
          {visits.error}
        </div>
      )}

      <LineChart data={visits.dailyVisits} color="#2a1f19" fill="rgba(42,31,25,0.08)" />

      <div style={{ marginTop: 16 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8,
        }}>
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
                    <th key={h} style={{
                      fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
                      padding: "8px 12px", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap",
                    }}>
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
                      style={{ padding: "10px 12px", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={v.url || v.pageId}
                    >
                      <span style={{ fontFamily: "monospace" }}>{v.pageId || v.url || "—"}</span>
                    </td>
                    <td
                      style={{ padding: "10px 12px", color: MUTED, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={formatLocation(v) || "Unknown"}
                    >
                      {formatLocation(v) || "—"}
                    </td>
                    <td
                      style={{ padding: "10px 12px", color: MUTED, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
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
                      style={{ padding: "10px 12px", color: MUTED, fontFamily: "monospace", fontSize: 11 }}
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
    </>
  );
}

function FeedbackList({ feedback }: { feedback: FeedbackRow[] }) {
  if (feedback.length === 0) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center", color: MUTED, fontSize: 13 }}>
        No feedback submitted yet.
      </div>
    );
  }
  return (
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
  );
}
