"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  Power,
  RefreshCw,
  Bot,
  Brain,
  Trash2,
  Plus,
  X,
  Plug,
  Server,
  Camera,
  Activity as ActivityIcon,
  Star,
  MessageSquare,
  Sliders,
} from "lucide-react";
import { Button } from "../../../shared/components/ui/button";
import { Input } from "../../../shared/components/ui/input";
import { ChatPageContent } from "../../../feature/chat/components/chat-page-content";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Landing palette ──────────────────────────────────────────────────────────
const BG = "#f8f2ed";
const INK = "#2a1f19";
const MUTED = "#6b5d52";
const CARD = "#fbf6f1";
const BORDER = "rgba(42,31,25,0.12)";
const ACCENT = "#FF4D00";
const ACCENT_SOFT = "rgba(255,77,0,0.08)";
const ACCENT_GLOW = "0 8px 25px rgba(255,77,0,0.18)";

function typeColor(_type?: string) {
  return "#2a1f19";
}

const pageStyles = `
  @keyframes oc-fade-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes oc-shimmer-anim { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  .oc-page-section { animation: oc-fade-up 0.5s ease both; }
  .oc-card { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
  .oc-card-hover:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(42,31,25,0.08); }
  .oc-btn-primary { transition: transform 0.18s ease, box-shadow 0.18s ease; }
  .oc-btn-primary:hover { transform: translateY(-1px); box-shadow: ${ACCENT_GLOW}; }
  .oc-avatar-wrap:hover .oc-avatar-overlay { opacity: 1; }
  .oc-shimmer-text {
    background:linear-gradient(90deg,#FF4D00 0%,#FF8C42 40%,#FFB88C 50%,#FF8C42 60%,#FF4D00 100%);
    background-size:200% 100%;
    -webkit-background-clip:text; background-clip:text;
    -webkit-text-fill-color:transparent;
    animation: oc-shimmer-anim 4s ease-in-out infinite;
    font-style: italic;
  }
  .oc-tab-btn { transition: color 0.18s ease, border-color 0.18s ease; }
  .oc-stat:hover { transform: translateY(-2px); border-color: rgba(255,77,0,0.35); }
`;

interface AgentRecord {
  id: string;
  name: string;
  botUsername: string;
  status: string;
  type?: string;
  containerId: string | null;
  profileImage?: string | null;
  systemPrompt?: string | null;
  createdAt: string;
  apiProvider?: string | null;
  agentModel?: string | null;
  hasApiKey?: boolean;
}

interface Activity {
  id: string;
  type: string;
  message: string;
  metadata: unknown;
  createdAt: string;
}

interface MemoryStats {
  sessionCount: number;
  totalMessages: number;
  estimatedTokens: number;
  sessions: { chatId: string; messageCount: number; estimatedTokens: number; lastUpdated: string }[];
}

interface Channel {
  id: string;
  platform: string;
  enabled: boolean;
  createdAt: string;
}

interface McpServer {
  id: string;
  serverName: string;
  transport: string;
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
}

interface AgentDetailContentProps {
  agentId: string;
}

function PlatformIcon({ platform }: { platform: "telegram" | "discord" | "whatsapp" }) {
  if (platform === "discord") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="#5865F2"/>
      </svg>
    );
  }
  if (platform === "whatsapp") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#25D366"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.128.558 4.121 1.532 5.85L.057 23.63a.5.5 0 0 0 .612.612l5.782-1.475A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.659-.522-5.168-1.431l-.37-.22-3.833.978.995-3.634-.24-.38A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" fill="#25D366"/>
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.9l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.963.659z" fill="#2AABEE"/>
    </svg>
  );
}

const MCP_TEMPLATES = [
  { name: "Notion", transport: "http" as const, configPlaceholder: { url: "https://mcp.notion.so", headers: { Authorization: "Bearer TOKEN" } } },
  { name: "Google Calendar", transport: "http" as const, configPlaceholder: { url: "https://mcp.googleapis.com/calendar", headers: { Authorization: "Bearer TOKEN" } } },
  { name: "GitHub", transport: "stdio" as const, configPlaceholder: { command: "npx", args: ["@modelcontextprotocol/server-github"] } },
  { name: "Filesystem", transport: "stdio" as const, configPlaceholder: { command: "npx", args: ["@modelcontextprotocol/server-filesystem", "/workspace"] } },
];

type Tab = "info" | "playground" | "aiSettings" | "platforms" | "skills" | "mcp" | "activity";

export function AgentDetailContent({ agentId }: AgentDetailContentProps) {
  const router = useRouter();
  const [agent, setAgent] = useState<AgentRecord | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);
  const [restarting, setRestarting] = useState(false);

  // Feedback modal
  const [showFeedback, setShowFeedback] = useState(false);
  const [fbRating, setFbRating] = useState(0);
  const [fbHover, setFbHover] = useState(0);
  const [fbComment, setFbComment] = useState("");
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbDone, setFbDone] = useState(false);

  const closeFeedback = () => {
    setShowFeedback(false);
    setFbRating(0);
    setFbHover(0);
    setFbComment("");
    setFbDone(false);
  };

  const submitFeedback = async () => {
    if (!fbRating || fbSubmitting) return;
    setFbSubmitting(true);
    try {
      await fetch("/api/feedback/agent-creation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: fbRating, comment: fbComment, agentId }),
      });
      setFbDone(true);
      setTimeout(closeFeedback, 1200);
    } catch {
      closeFeedback();
    } finally {
      setFbSubmitting(false);
    }
  };
  const [error, setError] = useState<string | null>(null);

  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [clearingContext, setClearingContext] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [expandedPlatform, setExpandedPlatform] = useState<"telegram" | "discord" | "whatsapp" | null>(null);
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [discordToken, setDiscordToken] = useState("");
  const [addingChannel, setAddingChannel] = useState(false);

  const [showWaModal, setShowWaModal] = useState(false);
  const [waLinkStatus, setWaLinkStatus] = useState<"idle" | "starting" | "qr_ready" | "linked" | "failed">("idle");
  const [waQrData, setWaQrData] = useState<string | null>(null);
  const [waError, setWaError] = useState<string | null>(null);
  const [waAllowedNumbers, setWaAllowedNumbers] = useState<string[]>([]);
  const [waAllowOwnerChat, setWaAllowOwnerChat] = useState(false);
  const [waSavingNumber, setWaSavingNumber] = useState(false);
  const [waNewNumber, setWaNewNumber] = useState("");

  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [showAddMcp, setShowAddMcp] = useState(false);
  const [mcpName, setMcpName] = useState("");
  const [mcpTransport, setMcpTransport] = useState<"stdio" | "http">("http");
  const [mcpUrl, setMcpUrl] = useState("");
  const [mcpCommand, setMcpCommand] = useState("npx");
  const [mcpArgs, setMcpArgs] = useState("");
  const [addingMcp, setAddingMcp] = useState(false);

  const [agentSkills, setAgentSkills] = useState<{ id: string; name: string; description: string; linkId: string }[]>([]);
  const [availableSkills, setAvailableSkills] = useState<{ id: string; name: string; description: string }[]>([]);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [addingSkill, setAddingSkill] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("info");

  // AI settings
  const [modelsCatalog, setModelsCatalog] = useState<Record<string, string[]>>({});
  const [aiProvider, setAiProvider] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiSaving, setAiSaving] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/models.json").then((r) => r.json()).then(setModelsCatalog).catch(() => {});
  }, []);

  useEffect(() => {
    if (agent) {
      setAiProvider(agent.apiProvider ?? "");
      setAiModel(agent.agentModel ?? "");
    }
  }, [agent]);

  const saveAiSettings = async () => {
    setAiSaving(true);
    setAiMessage(null);
    try {
      const payload: Record<string, string | null> = {
        apiProvider: aiProvider || null,
        agentModel: aiModel || null,
      };
      if (aiApiKey.trim()) payload.apiKey = aiApiKey.trim();
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiMessage({ kind: "err", text: data.error ?? "Failed to save AI settings." });
        return;
      }
      setAgent(data.agent);
      setAiApiKey("");
      setAiMessage({ kind: "ok", text: "AI settings saved. Restart the agent to apply." });
    } catch {
      setAiMessage({ kind: "err", text: "Network error. Please try again." });
    } finally {
      setAiSaving(false);
    }
  };

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fetchAgent = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      if (res.ok) {
        const data = await res.json();
        setAgent(data.agent);
        setActivities(data.activities ?? []);
      }
    } catch {
      setError("We couldn't load this agent. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const fetchMemory = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/memory`);
      if (res.ok) setMemoryStats(await res.json());
    } catch { /* non-critical */ }
  }, [agentId]);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/channels`);
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels ?? []);
      }
    } catch { /* non-critical */ }
    try {
      const res = await fetch(`/api/agents/${agentId}/whatsapp/allowed-number`);
      if (res.ok) {
        const data = await res.json();
        setWaAllowedNumbers(data.allowedNumbers ?? []);
        setWaAllowOwnerChat(data.allowOwnerChat ?? false);
      }
    } catch { /* non-critical */ }
  }, [agentId]);

  const fetchMcp = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/mcp`);
      if (res.ok) {
        const data = await res.json();
        setMcpServers(data.servers ?? []);
      }
    } catch { /* non-critical */ }
  }, [agentId]);

  const fetchAgentSkills = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/skills`);
      if (res.ok) {
        const data = await res.json();
        setAgentSkills(data.skills ?? []);
      }
    } catch { /* non-critical */ }
  }, [agentId]);

  const fetchAvailableSkills = useCallback(async () => {
    try {
      const res = await fetch(`/api/skills`);
      if (res.ok) {
        const data = await res.json();
        setAvailableSkills(data.skills ?? []);
      }
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    fetchAgent();
    fetchMemory();
    fetchChannels();
    fetchMcp();
    fetchAgentSkills();
    fetchAvailableSkills();
  }, [fetchAgent, fetchMemory, fetchChannels, fetchMcp, fetchAgentSkills, fetchAvailableSkills]);

  const handleStop = async () => {
    setStopping(true);
    setError(null);
    try {
      await fetch(`/api/agents/${agentId}`, { method: "DELETE" });
      router.push("/overview");
    } catch {
      setError("We couldn't stop this bot. Please try again.");
      setStopping(false);
    }
  };

  const handleRestart = async () => {
    setRestarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/restart`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "We couldn't restart this agent. Please try again.");
        return;
      }
      await fetchAgent();
    } catch {
      setError("We couldn't restart this agent. Please try again.");
    } finally {
      setRestarting(false);
    }
  };

  const handleClearContext = async () => {
    setClearingContext(true);
    setShowClearConfirm(false);
    try {
      await fetch(`/api/agents/${agentId}/memory`, { method: "DELETE" });
      await fetchMemory();
    } catch {
      setError("We couldn't clear context. Please try again.");
    } finally {
      setClearingContext(false);
    }
  };

  const handleAddChannel = async (platform: "telegram" | "discord", credentials: Record<string, string>) => {
    setAddingChannel(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, credentials }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to connect platform");
        return;
      }
      setTelegramToken(""); setTelegramUsername("");
      setDiscordToken("");
      setExpandedPlatform(null);
      await fetchChannels();
    } catch {
      setError("Failed to connect platform");
    } finally {
      setAddingChannel(false);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    try {
      await fetch(`/api/agents/${agentId}/channels/${channelId}`, { method: "DELETE" });
      await fetchChannels();
    } catch {
      setError("Failed to remove channel");
    }
  };

  const applyMcpTemplate = (tpl: (typeof MCP_TEMPLATES)[number]) => {
    setMcpName(tpl.name);
    setMcpTransport(tpl.transport);
    if (tpl.transport === "http") {
      setMcpUrl((tpl.configPlaceholder as { url: string }).url);
    } else {
      const cfg = tpl.configPlaceholder as { command: string; args: string[] };
      setMcpCommand(cfg.command);
      setMcpArgs(cfg.args.join(" "));
    }
  };

  const handleAddMcp = async () => {
    setAddingMcp(true);
    setError(null);
    try {
      const config =
        mcpTransport === "http"
          ? { url: mcpUrl }
          : { command: mcpCommand, args: mcpArgs.split(" ").filter(Boolean) };
      const res = await fetch(`/api/agents/${agentId}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverName: mcpName, transport: mcpTransport, config }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to add MCP server");
        return;
      }
      setMcpName(""); setMcpUrl(""); setMcpArgs(""); setMcpCommand("npx");
      setShowAddMcp(false);
      await fetchMcp();
    } catch {
      setError("Failed to add MCP server");
    } finally {
      setAddingMcp(false);
    }
  };

  const startWhatsappLink = async () => {
    setWaLinkStatus("starting");
    setWaQrData(null);
    setWaError(null);
    setShowWaModal(true);

    const res = await fetch(`/api/agents/${agentId}/whatsapp/link`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setWaError(data.error ?? "Failed to start linking");
      setWaLinkStatus("failed");
      return;
    }

    const poll = setInterval(async () => {
      const r = await fetch(`/api/agents/${agentId}/whatsapp/link`);
      if (!r.ok) return;
      const data = await r.json();
      if (data.status === "qr_ready") {
        setWaQrData(data.qrData);
        setWaLinkStatus("qr_ready");
      } else if (data.status === "linked") {
        setWaLinkStatus("linked");
        clearInterval(poll);
        await fetchChannels();
      } else if (data.status === "failed") {
        setWaLinkStatus("failed");
        setWaError("Linking failed. Please try again.");
        clearInterval(poll);
      }
    }, 3000);

    setTimeout(() => {
      clearInterval(poll);
      setWaLinkStatus((s) => (s === "qr_ready" || s === "starting" ? "failed" : s));
      setWaError((e) => e ?? "Timed out. Please try again.");
    }, 5 * 60 * 1000);
  };

  const cancelWhatsappLink = async () => {
    await fetch(`/api/agents/${agentId}/whatsapp/link`, { method: "DELETE" }).catch(() => {});
    setShowWaModal(false);
    setWaLinkStatus("idle");
    setWaQrData(null);
    setWaError(null);
  };

  const handleDeleteMcp = async (serverId: string) => {
    try {
      await fetch(`/api/agents/${agentId}/mcp/${serverId}`, { method: "DELETE" });
      await fetchMcp();
    } catch {
      setError("Failed to remove MCP server");
    }
  };

  const handleToggleMcp = async (serverId: string, enabled: boolean) => {
    try {
      await fetch(`/api/agents/${agentId}/mcp/${serverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      await fetchMcp();
    } catch {
      setError("Failed to update MCP server");
    }
  };

  const handleAddSkill = async (skillId: string) => {
    setAddingSkill(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to add skill");
        return;
      }
      setShowAddSkill(false);
      await fetchAgentSkills();
    } catch {
      setError("Failed to add skill");
    } finally {
      setAddingSkill(false);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    try {
      await fetch(`/api/agents/${agentId}/skills/${skillId}`, { method: "DELETE" });
      await fetchAgentSkills();
    } catch {
      setError("Failed to remove skill");
    }
  };

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const handleAvatarPick = () => avatarInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setUploadingAvatar(true);
    setError(null);
    try {
      const dataUri = await resizeToDataUri(file, 256);
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileImage: dataUri }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to update profile picture");
        return;
      }
      const data = await res.json();
      setAgent(data.agent);
    } catch {
      setError("Failed to upload profile picture");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const connectedPlatformCount = (() => {
    const username = agent?.botUsername ?? "";
    const primary = username.startsWith("discord_") ? "discord" : username.startsWith("whatsapp_") ? "whatsapp" : username ? "telegram" : null;
    const extras = channels.map((c) => c.platform);
    const all = new Set<string>([...(primary ? [primary] : []), ...extras]);
    return all.size;
  })();

  const stats = [
    { label: "Sessions", value: memoryStats?.sessionCount ?? 0, tab: "info" as Tab },
    { label: "Messages", value: memoryStats?.totalMessages ?? 0, tab: "info" as Tab },
    { label: "Tokens", value: memoryStats ? (memoryStats.estimatedTokens >= 1000 ? `${(memoryStats.estimatedTokens / 1000).toFixed(1)}k` : memoryStats.estimatedTokens) : 0, tab: "info" as Tab },
    { label: "Channels", value: connectedPlatformCount, tab: "platforms" as Tab },
    { label: "Skills", value: agentSkills.length, tab: "skills" as Tab },
    { label: "MCP Servers", value: mcpServers.length, tab: "mcp" as Tab },
  ];

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "info", label: "Info", icon: <Brain size={14} /> },
    { key: "playground", label: "Playground", icon: <Bot size={14} /> },
    { key: "aiSettings", label: "AI Settings", icon: <Sliders size={14} /> },
    { key: "platforms", label: "Platforms", icon: <Plug size={14} /> },
    { key: "skills", label: "Skills", icon: <Brain size={14} /> },
    { key: "mcp", label: "MCP", icon: <Server size={14} /> },
    { key: "activity", label: "Activity", icon: <ActivityIcon size={14} /> },
  ];

  return (
    <>
      <style>{pageStyles}</style>
      <div style={{ background: BG, color: INK, minHeight: "100vh", padding: "0 0 80px", margin: "-100px -2.5rem -3rem", }}>
        {/* Cover band */}
        <div
          style={{
            position: "relative",
            height: 160,
          }}
        >
          <Link
            href="/overview"
            style={{
              position: "absolute",
              top: 20,
              left: 24,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: MUTED,
              textDecoration: "none",
              padding: "6px 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.55)",
              border: `1px solid ${BORDER}`,
            }}
          >
            <ArrowLeft size={14} /> Overview
          </Link>
        </div>

        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 2rem" }}>
          {/* Profile header */}
          <div
            className="oc-page-section"
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 24,
              marginTop: -64,
              marginBottom: 28,
              flexWrap: "wrap",
            }}
          >
            <div
              className="oc-avatar-wrap"
              style={{ position: "relative", cursor: "pointer" }}
              onClick={handleAvatarPick}
            >
              <div
                style={{
                  width: 128,
                  height: 128,
                  borderRadius: "50%",
                  background: agent?.profileImage ? "transparent" : `linear-gradient(135deg,${ACCENT} 0%,#FF8C42 100%)`,
                  border: `4px solid ${BG}`,
                  boxShadow: "0 10px 30px rgba(42,31,25,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {agent?.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={agent.profileImage} alt={agent.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Bot size={56} color="#fff" />
                )}
              </div>
              <div
                className="oc-avatar-overlay"
                style={{
                  position: "absolute",
                  inset: 4,
                  borderRadius: "50%",
                  background: "rgba(42,31,25,0.55)",
                  opacity: uploadingAvatar ? 1 : 0,
                  transition: "opacity 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {uploadingAvatar ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Uploading
                  </>
                ) : (
                  <>
                    <Camera size={18} /> Change photo
                  </>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: "none" }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 260, paddingBottom: 4 }}>
              <h1
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 36,
                  fontWeight: 600,
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                <span className="oc-shimmer-text">{agent?.name ?? " "}</span>
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap", color: MUTED, fontSize: 14 }}>
                <span style={{ fontFamily: "var(--mono), monospace" }}>@{agent?.botUsername}</span>
                {agent?.type && (
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      color: typeColor(agent.type),
                      background: `${typeColor(agent.type)}14`,
                      border: `1px solid ${typeColor(agent.type)}33`,
                      textTransform: "capitalize",
                    }}
                  >
                    {agent.type}
                  </span>
                )}
                {agent && <StatusPill status={agent.status} />}
                {agent && (
                  <span style={{ fontSize: 12, color: MUTED }}>
                    · Created {new Date(agent.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {agent && (
              <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => setShowFeedback(true)}
                  className="oc-btn-primary"
                  title="Share feedback about this agent"
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: `1px solid ${BORDER}`,
                    background: CARD,
                    color: INK,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <MessageSquare size={14} /> Feedback
                </button>
              </div>
            )}

            {agent?.status === "active" && (
              <div style={{ display: "inline-flex", gap: 8 }}>
                <button
                  onClick={handleRestart}
                  disabled={restarting || stopping}
                  className="oc-btn-primary"
                  title="Stop and relaunch the agent task (preserves memory)"
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: `1px solid ${BORDER}`,
                    background: CARD,
                    color: INK,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: restarting || stopping ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <RefreshCw size={14} className={restarting ? "oc-spin" : undefined} />
                  {restarting ? "Restarting..." : "Restart agent"}
                </button>
                <button
                  onClick={handleStop}
                  disabled={stopping || restarting}
                  className="oc-btn-primary"
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: `1px solid rgba(226,61,45,0.35)`,
                    background: "rgba(226,61,45,0.08)",
                    color: "#c83426",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: stopping || restarting ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Power size={14} /> {stopping ? "Stopping..." : "Delete agent"}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div
              style={{
                background: "rgba(226,61,45,0.08)",
                border: "1px solid rgba(226,61,45,0.25)",
                borderRadius: 10,
                padding: "10px 14px",
                color: "#c83426",
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "80px 0", color: MUTED }}>
              <RefreshCw size={24} className="animate-spin" />
            </div>
          ) : !agent ? (
            <p style={{ color: MUTED }}>Agent not found.</p>
          ) : (
            <>
              {/* Stats row */}
              <div
                className="oc-page-section"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                  gap: 12,
                  marginBottom: 28,
                }}
              >
                {stats.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setActiveTab(s.tab)}
                    className="oc-stat oc-card"
                    style={{
                      background: CARD,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 14,
                      padding: "16px 18px",
                      textAlign: "left",
                      cursor: "pointer",
                      color: INK,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {s.label}
                    </div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 600, marginTop: 4 }}>
                      {s.value}
                    </div>
                  </button>
                ))}
              </div>

              {/* Tab bar */}
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  borderBottom: `1px solid ${BORDER}`,
                  marginBottom: 24,
                  overflowX: "auto",
                }}
              >
                {tabs.map((t) => {
                  const active = activeTab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className="oc-tab-btn"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "10px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        color: active ? ACCENT : MUTED,
                        background: "transparent",
                        border: "none",
                        borderBottom: `2px solid ${active ? ACCENT : "transparent"}`,
                        marginBottom: -1,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.icon} {t.label}
                    </button>
                  );
                })}
              </div>

              {activeTab === "info" && (
                <div className="oc-page-section" style={{ display: "grid", gap: 20 }}>
                  {agent.systemPrompt && (
                    <Card title="Bio" icon={<Brain size={16} />}>
                      <p style={{ margin: 0, fontSize: 14, color: INK, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                        {agent.systemPrompt}
                      </p>
                    </Card>
                  )}
                  <Card
                    title="Context Memory"
                    icon={<Brain size={16} />}
                    action={
                      !showClearConfirm ? (
                        <button
                          onClick={() => setShowClearConfirm(true)}
                          disabled={clearingContext || !memoryStats || memoryStats.totalMessages === 0}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#c83426",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: clearingContext ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Trash2 size={14} /> Clear
                        </button>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: MUTED }}>Erase all history?</span>
                          <button
                            onClick={handleClearContext}
                            style={{ background: "transparent", border: "none", color: "#c83426", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setShowClearConfirm(false)}
                            style={{ background: "transparent", border: "none", color: MUTED, fontSize: 12, cursor: "pointer" }}
                          >
                            Cancel
                          </button>
                        </div>
                      )
                    }
                  >
                    {memoryStats ? (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                        <Stat small label="Sessions" value={memoryStats.sessionCount} />
                        <Stat small label="Messages" value={memoryStats.totalMessages} />
                        <Stat
                          small
                          label="Est. Tokens"
                          value={
                            memoryStats.estimatedTokens >= 1000
                              ? `${(memoryStats.estimatedTokens / 1000).toFixed(1)}k`
                              : memoryStats.estimatedTokens
                          }
                        />
                      </div>
                    ) : (
                      <div style={{ height: 80, background: "rgba(42,31,25,0.05)", borderRadius: 10 }} />
                    )}
                  </Card>
                </div>
              )}

              {activeTab === "aiSettings" && (
                <div className="oc-page-section" style={{ display: "grid", gap: 20 }}>
                  <Card title="AI Provider & Model" icon={<Sliders size={16} />}>
                    <div style={{ display: "grid", gap: 14 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                            Provider
                          </label>
                          <select
                            value={aiProvider}
                            onChange={(e) => { setAiProvider(e.target.value); setAiModel(""); }}
                            style={{
                              padding: "10px 12px",
                              borderRadius: 8,
                              border: `1px solid ${BORDER}`,
                              background: "#fff",
                              color: INK,
                              fontSize: 13,
                              cursor: "pointer",
                            }}
                          >
                            <option value="">Select provider...</option>
                            {Object.keys(modelsCatalog).map((p) => (
                              <option key={p} value={p}>
                                {p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                            Model
                          </label>
                          <select
                            value={aiModel}
                            onChange={(e) => setAiModel(e.target.value)}
                            disabled={!aiProvider}
                            style={{
                              padding: "10px 12px",
                              borderRadius: 8,
                              border: `1px solid ${BORDER}`,
                              background: "#fff",
                              color: INK,
                              fontSize: 13,
                              cursor: aiProvider ? "pointer" : "not-allowed",
                            }}
                          >
                            <option value="">
                              {aiProvider ? "Select model..." : "Select a provider first"}
                            </option>
                            {(modelsCatalog[aiProvider] ?? []).map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                          API Key {agent.hasApiKey && <span style={{ color: "#2f9e5e", textTransform: "none", letterSpacing: 0, marginLeft: 6 }}>· key on file</span>}
                        </label>
                        <Input
                          type="password"
                          value={aiApiKey}
                          onChange={(e) => setAiApiKey(e.target.value)}
                          placeholder={agent.hasApiKey ? "•••••••••••••  (leave blank to keep current)" : "sk-..."}
                          autoComplete="off"
                        />
                        <p style={{ margin: 0, fontSize: 11, color: MUTED }}>
                          Keys are encrypted at rest. Leave blank to keep the existing key.
                        </p>
                      </div>

                      {aiMessage && (
                        <div
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            fontSize: 12,
                            background: aiMessage.kind === "ok" ? "rgba(47,158,94,0.10)" : "rgba(200,52,38,0.08)",
                            color: aiMessage.kind === "ok" ? "#2f9e5e" : "#c83426",
                            border: `1px solid ${aiMessage.kind === "ok" ? "rgba(47,158,94,0.3)" : "rgba(200,52,38,0.25)"}`,
                          }}
                        >
                          {aiMessage.text}
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <Button
                          onClick={saveAiSettings}
                          disabled={aiSaving}
                          style={{
                            background: ACCENT,
                            color: "#fff",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: aiSaving ? "wait" : "pointer",
                          }}
                        >
                          {aiSaving ? "Saving..." : "Save AI Settings"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {activeTab === "playground" && (
                <div
                  className="oc-page-section"
                  style={{
                    height: 620,
                    borderRadius: 16,
                    border: `1px solid ${BORDER}`,
                    background: "#111111",
                    overflow: "hidden",
                  }}
                >
                  <ChatPageContent defaultAgentId={agentId} hideHeader={true} />
                </div>
              )}

              {activeTab === "platforms" && (
                <div className="oc-page-section" style={{ display: "grid", gap: 12 }}>
                  {(["telegram", "discord", "whatsapp"] as const).map((platform) => {
                    const username = agent.botUsername ?? "";
                    const primaryPlatform = username.startsWith("discord_")
                      ? "discord"
                      : username.startsWith("whatsapp_")
                        ? "whatsapp"
                        : "telegram";
                    const isPrimary = primaryPlatform === platform;
                    const channelRecord = channels.find((c) => c.platform === platform);
                    const isConnected = isPrimary || !!channelRecord;
                    const isExpanded = expandedPlatform === platform;
                    const isWhatsApp = platform === "whatsapp";
                    const handle = isPrimary
                      ? platform === "telegram"
                        ? `@${username}`
                        : username.replace(/^(discord_|whatsapp_)/, "")
                      : channelRecord
                        ? `Added ${new Date(channelRecord.createdAt).toLocaleDateString()}`
                        : null;

                    return (
                      <div key={platform}>
                        <div
                          className="oc-card oc-card-hover"
                          onClick={() => {
                            if (!isConnected) {
                              if (isWhatsApp) { setShowWaModal(true); startWhatsappLink(); }
                              else setExpandedPlatform(isExpanded ? null : platform);
                            }
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "14px 18px",
                            background: CARD,
                            border: `1px solid ${BORDER}`,
                            borderRadius: 12,
                            cursor: isConnected ? "default" : "pointer",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <PlatformIcon platform={platform} />
                            <div>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, textTransform: "capitalize" }}>
                                {platform === "whatsapp" ? "WhatsApp" : platform}
                              </p>
                              <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
                                {isConnected && handle ? handle : "Not connected · click to connect"}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {isConnected && agent.status === "active" && (
                              <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 999, color: "#2f9e5e", background: "rgba(47,158,94,0.12)" }}>
                                Active
                              </span>
                            )}
                            {isConnected && channelRecord && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteChannel(channelRecord.id); }}
                                style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer" }}
                              >
                                <X size={16} />
                              </button>
                            )}
                            {!isConnected && (
                              <span style={{ fontSize: 11, color: MUTED }}>{isWhatsApp ? "→" : isExpanded ? "▲" : "▼"}</span>
                            )}
                          </div>
                        </div>

                        {isConnected && isWhatsApp && (() => {
                          const saveAll = async (numbers: string[], ownerChat: boolean) => {
                            setWaSavingNumber(true);
                            try {
                              const res = await fetch(`/api/agents/${agentId}/whatsapp/allowed-number`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ phoneNumbers: numbers, allowOwnerChat: ownerChat }),
                              });
                              if (res.ok) {
                                setWaAllowedNumbers(numbers);
                                setWaAllowOwnerChat(ownerChat);
                              }
                            } finally {
                              setWaSavingNumber(false);
                            }
                          };
                          const addNumber = async (raw: string) => {
                            const digits = raw.replace(/[^\d]/g, "");
                            const entry = digits ? `+${digits}` : "";
                            if (!entry || waAllowedNumbers.includes(entry)) return;
                            await saveAll([...waAllowedNumbers, entry], waAllowOwnerChat);
                            setWaNewNumber("");
                          };
                          const removeNumber = (num: string) => saveAll(waAllowedNumbers.filter((n) => n !== num), waAllowOwnerChat);
                          const toggleOwnerChat = () => saveAll(waAllowedNumbers, !waAllowOwnerChat);
                          const hasAnyFilter = waAllowedNumbers.length > 0 || waAllowOwnerChat;
                          return (
                            <div style={{ marginTop: 4, padding: 16, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, display: "grid", gap: 10 }}>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: INK }}>
                                Allowed senders
                                <span style={{ fontWeight: 400, color: MUTED }}> — leave empty to respond to everyone</span>
                              </p>


                              {/* My own WhatsApp chat toggle */}
                              <div
                                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: BG, borderRadius: 8, border: `1px solid ${BORDER}` }}
                              >
                                <div>
                                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: INK }}>My own WhatsApp chat</p>
                                  <p style={{ margin: 0, fontSize: 11, color: MUTED }}>Allow messages from your personal &quot;message me&quot; chat</p>
                                </div>
                                <button
                                  onClick={toggleOwnerChat}
                                  disabled={waSavingNumber}
                                  style={{
                                    width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
                                    background: waAllowOwnerChat ? "#25D366" : BORDER,
                                    position: "relative", flexShrink: 0, transition: "background 0.2s",
                                  }}
                                >
                                  <span style={{
                                    position: "absolute", top: 3, left: waAllowOwnerChat ? 21 : 3,
                                    width: 16, height: 16, borderRadius: "50%", background: "#fff",
                                    transition: "left 0.2s",
                                  }} />
                                </button>
                              </div>

                              {/* Other allowed numbers */}
                              {waAllowedNumbers.map((num) => (
                                <div key={num} style={{ display: "flex", alignItems: "center", gap: 8, background: BG, borderRadius: 8, padding: "6px 10px" }}>
                                  <span style={{ flex: 1, fontSize: 13, fontFamily: "var(--mono, monospace)", color: INK }}>{num}</span>
                                  <button
                                    onClick={() => removeNumber(num)}
                                    disabled={waSavingNumber}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 2, lineHeight: 0 }}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}

                              {/* Add other phone numbers */}
                              <div style={{ display: "flex", gap: 8 }}>
                                <Input
                                  placeholder="Other number with country code, e.g. 212612345678"
                                  value={waNewNumber}
                                  onChange={(e) => setWaNewNumber(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter" && waNewNumber.trim()) addNumber(waNewNumber.trim()); }}
                                  style={{ flex: 1, fontSize: 13 }}
                                />
                                <Button
                                  size="sm"
                                  disabled={waSavingNumber || !waNewNumber.trim()}
                                  onClick={() => addNumber(waNewNumber.trim())}
                                  style={{ background: "#25D366", color: "#fff", whiteSpace: "nowrap" }}
                                >
                                  {waSavingNumber ? "…" : "Add"}
                                </Button>
                              </div>
                            </div>
                          );
                        })()}

                        {isExpanded && !isConnected && (
                          <div
                            style={{
                              marginTop: 4,
                              padding: 16,
                              background: CARD,
                              border: `1px solid ${BORDER}`,
                              borderRadius: 12,
                              display: "grid",
                              gap: 10,
                            }}
                          >
                            {platform === "telegram" && (
                              <>
                                <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
                                  Create a bot via @BotFather on Telegram, copy the token and username.
                                </p>
                                <Input
                                  placeholder="Bot Token (from @BotFather)"
                                  value={telegramToken}
                                  onChange={(e) => setTelegramToken(e.target.value)}
                                />
                                <Input
                                  placeholder="Bot username (without @)"
                                  value={telegramUsername}
                                  onChange={(e) => setTelegramUsername(e.target.value)}
                                />
                                <div style={{ display: "flex", gap: 8 }}>
                                  <Button
                                    size="sm"
                                    disabled={addingChannel || !telegramToken || !telegramUsername}
                                    onClick={() => handleAddChannel("telegram", { botToken: telegramToken, botUsername: telegramUsername })}
                                    style={{ background: "#2AABEE", color: "#fff" }}
                                  >
                                    {addingChannel ? "Connecting…" : "Connect Telegram"}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setExpandedPlatform(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              </>
                            )}

                            {platform === "discord" && (
                              <>
                                <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
                                  Create a bot at discord.com/developers, copy the bot token, then invite the bot to your server.
                                </p>
                                <Input
                                  placeholder="Bot Token"
                                  value={discordToken}
                                  onChange={(e) => setDiscordToken(e.target.value)}
                                />
                                <div style={{ display: "flex", gap: 8 }}>
                                  <Button
                                    size="sm"
                                    disabled={addingChannel || !discordToken}
                                    onClick={() => handleAddChannel("discord", { botToken: discordToken })}
                                    style={{ background: "#5865F2", color: "#fff" }}
                                  >
                                    {addingChannel ? "Connecting…" : "Connect Discord"}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setExpandedPlatform(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === "skills" && (
                <div className="oc-page-section" style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h2 style={{ fontFamily: "var(--serif)", fontSize: 20, margin: 0 }}>
                      <em>Skills</em>
                    </h2>
                    <AccentButton onClick={() => setShowAddSkill(!showAddSkill)}>
                      <Plus size={14} /> Add Skill
                    </AccentButton>
                  </div>

                  {showAddSkill && (
                    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, display: "grid", gap: 8 }}>
                      <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>Select a skill to attach</p>
                      {availableSkills
                        .filter((s) => !agentSkills.some((as_) => as_.id === s.id))
                        .map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleAddSkill(s.id)}
                            disabled={addingSkill}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: "rgba(255,255,255,0.55)",
                              border: `1px solid ${BORDER}`,
                              borderRadius: 10,
                              padding: "10px 14px",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <div>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: INK }}>{s.name}</p>
                              {s.description && (
                                <p style={{ margin: 0, fontSize: 12, color: MUTED }}>{s.description}</p>
                              )}
                            </div>
                            <Plus size={16} color={MUTED} />
                          </button>
                        ))}
                      {availableSkills.filter((s) => !agentSkills.some((as_) => as_.id === s.id)).length === 0 && (
                        <p style={{ fontSize: 13, color: MUTED, margin: "6px 0" }}>No available skills to add.</p>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setShowAddSkill(false)}>Cancel</Button>
                    </div>
                  )}

                  {agentSkills.length === 0 ? (
                    <p style={{ fontSize: 13, color: MUTED }}>No skills attached.</p>
                  ) : (
                    agentSkills.map((s) => (
                      <div
                        key={s.linkId}
                        className="oc-card oc-card-hover"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 16px",
                          background: CARD,
                          border: `1px solid ${BORDER}`,
                          borderRadius: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Brain size={16} color={MUTED} />
                          <div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{s.name}</p>
                            {s.description && (
                              <p style={{ margin: 0, fontSize: 12, color: MUTED }}>{s.description}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveSkill(s.id)}
                          style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer" }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "mcp" && (
                <div className="oc-page-section" style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h2 style={{ fontFamily: "var(--serif)", fontSize: 20, margin: 0 }}>
                      <em>MCP Servers</em>
                    </h2>
                    <AccentButton onClick={() => setShowAddMcp(!showAddMcp)}>
                      <Plus size={14} /> Add Server
                    </AccentButton>
                  </div>

                  {showAddMcp && (
                    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, display: "grid", gap: 12 }}>
                      <div>
                        <p style={{ fontSize: 12, color: MUTED, margin: "0 0 6px" }}>Quick templates</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {MCP_TEMPLATES.map((tpl) => (
                            <button
                              key={tpl.name}
                              onClick={() => applyMcpTemplate(tpl)}
                              style={{
                                padding: "4px 10px",
                                fontSize: 11,
                                borderRadius: 999,
                                background: "rgba(42,31,25,0.05)",
                                color: INK,
                                border: `1px solid ${BORDER}`,
                                cursor: "pointer",
                              }}
                            >
                              {tpl.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Input
                        placeholder="Server name (e.g. Notion)"
                        value={mcpName}
                        onChange={(e) => setMcpName(e.target.value)}
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        {(["http", "stdio"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setMcpTransport(t)}
                            style={{
                              padding: "4px 12px",
                              fontSize: 11,
                              fontWeight: 600,
                              borderRadius: 999,
                              border: `1px solid ${mcpTransport === t ? ACCENT : BORDER}`,
                              background: mcpTransport === t ? ACCENT_SOFT : "transparent",
                              color: mcpTransport === t ? ACCENT : MUTED,
                              cursor: "pointer",
                            }}
                          >
                            {t === "http" ? "HTTP / SSE" : "Stdio"}
                          </button>
                        ))}
                      </div>
                      {mcpTransport === "http" ? (
                        <Input
                          placeholder="Server URL (https://...)"
                          value={mcpUrl}
                          onChange={(e) => setMcpUrl(e.target.value)}
                        />
                      ) : (
                        <>
                          <div style={{ display: "flex", gap: 6 }}>
                            {["npx", "node", "python3"].map((cmd) => (
                              <button
                                key={cmd}
                                onClick={() => setMcpCommand(cmd)}
                                style={{
                                  padding: "2px 10px",
                                  fontSize: 11,
                                  borderRadius: 6,
                                  background: mcpCommand === cmd ? ACCENT_SOFT : "rgba(42,31,25,0.05)",
                                  border: `1px solid ${mcpCommand === cmd ? ACCENT : BORDER}`,
                                  color: mcpCommand === cmd ? ACCENT : INK,
                                  cursor: "pointer",
                                }}
                              >
                                {cmd}
                              </button>
                            ))}
                          </div>
                          <Input
                            placeholder="Args (e.g. @notionhq/mcp --token TOKEN)"
                            value={mcpArgs}
                            onChange={(e) => setMcpArgs(e.target.value)}
                          />
                        </>
                      )}
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button
                          size="sm"
                          onClick={handleAddMcp}
                          disabled={addingMcp || !mcpName}
                          style={{ background: ACCENT, color: "#fff" }}
                        >
                          {addingMcp ? "Adding..." : "Add Server"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowAddMcp(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {mcpServers.length === 0 ? (
                    <p style={{ fontSize: 13, color: MUTED }}>No MCP servers configured.</p>
                  ) : (
                    mcpServers.map((srv) => (
                      <div
                        key={srv.id}
                        className="oc-card oc-card-hover"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 16px",
                          background: CARD,
                          border: `1px solid ${BORDER}`,
                          borderRadius: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Server size={16} color={MUTED} />
                          <div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{srv.serverName}</p>
                            <p style={{ margin: 0, fontSize: 11, color: MUTED, fontFamily: "var(--mono), monospace" }}>{srv.transport}</p>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button
                            onClick={() => handleToggleMcp(srv.id, !srv.enabled)}
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "2px 10px",
                              borderRadius: 999,
                              border: "none",
                              cursor: "pointer",
                              background: srv.enabled ? "rgba(47,158,94,0.12)" : "rgba(42,31,25,0.06)",
                              color: srv.enabled ? "#2f9e5e" : MUTED,
                            }}
                          >
                            {srv.enabled ? "Enabled" : "Disabled"}
                          </button>
                          <button
                            onClick={() => handleDeleteMcp(srv.id)}
                            style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer" }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "activity" && (
                <div className="oc-page-section" style={{ display: "grid", gap: 10 }}>
                  <h2 style={{ fontFamily: "var(--serif)", fontSize: 20, margin: 0 }}>
                    <em>Activity</em>
                  </h2>
                  {activities.length === 0 ? (
                    <p style={{ fontSize: 13, color: MUTED }}>No activity yet.</p>
                  ) : (
                    activities.map((a) => (
                      <div
                        key={a.id}
                        style={{
                          display: "flex",
                          gap: 12,
                          padding: "12px 16px",
                          background: CARD,
                          border: `1px solid ${BORDER}`,
                          borderRadius: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            marginTop: 7,
                            flexShrink: 0,
                            background:
                              a.type === "error"
                                ? "#c83426"
                                : a.type === "launch"
                                  ? "#2f9e5e"
                                  : a.type === "stop"
                                    ? "rgba(42,31,25,0.35)"
                                    : ACCENT,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 14, color: INK }}>{a.message}</p>
                          <p style={{ margin: 0, fontSize: 11, color: MUTED, marginTop: 2 }}>
                            {new Date(a.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showWaModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(42,31,25,0.45)", backdropFilter: "blur(4px)" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: 400, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, boxShadow: "0 20px 60px rgba(42,31,25,0.25)" }}>
            <button
              onClick={cancelWhatsappLink}
              style={{ position: "absolute", right: 14, top: 14, background: "transparent", border: "none", color: MUTED, cursor: "pointer" }}
            >
              <X size={18} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <PlatformIcon platform="whatsapp" />
              <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0, color: INK }}>Link WhatsApp</h2>
            </div>

            {waLinkStatus === "starting" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "24px 0" }}>
                <RefreshCw size={28} color="#25D366" className="animate-spin" />
                <p style={{ fontSize: 13, color: MUTED, textAlign: "center", margin: 0 }}>Starting WhatsApp pairing session…</p>
              </div>
            )}

            {waLinkStatus === "qr_ready" && waQrData && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <p style={{ fontSize: 12, color: MUTED, textAlign: "center", margin: 0 }}>
                  Open WhatsApp on your phone → Linked Devices → Link a Device → scan this QR code
                </p>
                <div style={{ background: "#fff", padding: 12, borderRadius: 12 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(waQrData)}`}
                    alt="WhatsApp QR code"
                    width={220}
                    height={220}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: MUTED }}>
                  <RefreshCw size={12} className="animate-spin" /> Waiting for scan…
                </div>
              </div>
            )}

            {waLinkStatus === "linked" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "16px 0" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(37,211,102,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <PlatformIcon platform="whatsapp" />
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: INK }}>WhatsApp Linked!</p>
                <Button size="sm" onClick={() => { setShowWaModal(false); setWaLinkStatus("idle"); }} style={{ background: "#25D366", color: "#fff" }}>
                  Done
                </Button>
              </div>
            )}

            {waLinkStatus === "failed" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "16px 0" }}>
                <p style={{ fontSize: 13, color: "#c83426", textAlign: "center", margin: 0 }}>{waError ?? "Linking failed"}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button size="sm" onClick={startWhatsappLink} style={{ background: ACCENT, color: "#fff" }}>Retry</Button>
                  <Button size="sm" variant="ghost" onClick={cancelWhatsappLink}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedback && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(28,22,18,0.4)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}
          onClick={(e) => { if (e.target === e.currentTarget && !fbSubmitting) closeFeedback(); }}
        >
          <div
            style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "1.75rem", width: "100%", maxWidth: 440, margin: "1rem", boxShadow: "0 20px 50px rgba(42,31,25,0.18)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <h2 style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, margin: 0, color: INK }}>
                  <em>Share feedback</em>
                </h2>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: MUTED }}>
                  How has {agent?.name ?? "this agent"} worked out for you?
                </p>
              </div>
              {!fbSubmitting && (
                <button
                  onClick={closeFeedback}
                  aria-label="Close"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: MUTED }}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {fbDone ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "#2f8a33", fontSize: 14, fontWeight: 500 }}>
                Thanks for your feedback!
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "16px 0 18px" }}>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = (fbHover || fbRating) >= n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setFbRating(n)}
                        onMouseEnter={() => setFbHover(n)}
                        onMouseLeave={() => setFbHover(0)}
                        aria-label={`${n} star${n > 1 ? "s" : ""}`}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 0 }}
                      >
                        <Star
                          size={32}
                          fill={active ? "#FFB400" : "transparent"}
                          stroke={active ? "#FFB400" : MUTED}
                          strokeWidth={1.5}
                        />
                      </button>
                    );
                  })}
                </div>

                <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                  Optional comment
                </div>
                <textarea
                  value={fbComment}
                  onChange={(e) => setFbComment(e.target.value)}
                  placeholder="Anything that felt great or frustrating?"
                  rows={3}
                  maxLength={2000}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    fontSize: 13,
                    color: INK,
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={closeFeedback}
                    disabled={fbSubmitting}
                    style={{ background: "transparent", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: fbSubmitting ? "not-allowed" : "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitFeedback}
                    disabled={!fbRating || fbSubmitting}
                    className="oc-btn-primary"
                    style={{
                      background: fbRating ? ACCENT : "rgba(255,77,0,0.4)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "9px 18px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: !fbRating || fbSubmitting ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {fbSubmitting && <RefreshCw size={14} className="oc-spin" />}
                    Submit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active: { bg: "rgba(42,31,25,0.08)", color: "#2a1f19" },
    error: { bg: "rgba(42,31,25,0.08)", color: "#2a1f19" },
    starting: { bg: "rgba(42,31,25,0.08)", color: "#6b5a4d" },
  };
  const style = map[status] ?? { bg: "rgba(42,31,25,0.08)", color: MUTED };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: style.bg,
        color: style.color,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: style.color }} />
      {status}
    </span>
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
      className="oc-card"
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
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

function Stat({ label, value, small }: { label: string; value: React.ReactNode; small?: boolean }) {
  return (
    <div style={{ background: "rgba(42,31,25,0.04)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--serif)", fontSize: small ? 22 : 28, fontWeight: 600, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function AccentButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="oc-btn-primary"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        background: ACCENT,
        color: "#fff",
        border: "none",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ── Utilities ────────────────────────────────────────────────────────────────

async function resizeToDataUri(file: File, maxDim: number): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => { URL.revokeObjectURL(url); resolve(el); };
    el.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    el.src = url;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not supported");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}
