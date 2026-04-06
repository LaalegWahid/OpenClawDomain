"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Power, RefreshCw, Bot, Brain, Trash2, Plus, X, Plug, Server } from "lucide-react";
// Note: Plus is still used in MCP Servers section
import { SidebarInset } from "../../../shared/components/ui/sidebar";
import { Separator } from "../../../shared/components/ui/separator";
import { Button } from "../../../shared/components/ui/button";
import { Input } from "../../../shared/components/ui/input";
import Link from "next/link";

type AgentType = "finance" | "marketing" | "operations";

const TYPE_BADGE_STYLES: Record<AgentType, string> = {
  finance: "bg-green-500/15 text-green-400 border-green-500/30",
  marketing: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  operations: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

interface AgentRecord {
  id: string;
  name: string;
  botUsername: string;
  status: string;
  type?: AgentType;
  containerId: string | null;
  createdAt: string;
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
  // Telegram
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

export function AgentDetailContent({ agentId }: AgentDetailContentProps) {
  const [agent, setAgent] = useState<AgentRecord | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memory
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [clearingContext, setClearingContext] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Channels
  const [channels, setChannels] = useState<Channel[]>([]);
  const [expandedPlatform, setExpandedPlatform] = useState<"telegram" | "discord" | "whatsapp" | null>(null);
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [discordToken, setDiscordToken] = useState("");
  const [addingChannel, setAddingChannel] = useState(false);

  // WhatsApp QR linking
  const [showWaModal, setShowWaModal] = useState(false);
  const [waLinkStatus, setWaLinkStatus] = useState<"idle" | "starting" | "qr_ready" | "linked" | "failed">("idle");
  const [waQrData, setWaQrData] = useState<string | null>(null);
  const [waError, setWaError] = useState<string | null>(null);

  // MCP
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [showAddMcp, setShowAddMcp] = useState(false);
  const [mcpName, setMcpName] = useState("");
  const [mcpTransport, setMcpTransport] = useState<"stdio" | "http">("http");
  const [mcpUrl, setMcpUrl] = useState("");
  const [mcpCommand, setMcpCommand] = useState("npx");
  const [mcpArgs, setMcpArgs] = useState("");
  const [addingMcp, setAddingMcp] = useState(false);

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

  useEffect(() => {
    fetchAgent();
    fetchMemory();
    fetchChannels();
    fetchMcp();
  }, [fetchAgent, fetchMemory, fetchChannels, fetchMcp]);

  const handleStop = async () => {
    setStopping(true);
    setError(null);
    try {
      await fetch(`/api/agents/${agentId}`, { method: "DELETE" });
      await fetchAgent();
    } catch {
      setError("We couldn't stop this bot. Please try again.");
    } finally {
      setStopping(false);
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

    // Poll for QR / success
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

    // Stop polling after 5 minutes
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

  return (
    <SidebarInset>
      <main className="flex flex-1 flex-col gap-6 p-6 bg-black">
        <Link href="/overview">
          <Button variant="ghost" className="text-white/60 hover:text-white gap-2 px-0">
            <ArrowLeft className="size-4" />
            Back to Overview
          </Button>
        </Link>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="size-6 animate-spin text-white/40" />
          </div>
        ) : !agent ? (
          <p className="text-white/50">Agent not found.</p>
        ) : (
          <>
            {/* Agent header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-brand-dark to-brand">
                  <Bot className="size-7 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{agent.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-white/50">
                      @{agent.botUsername} &middot; Created{" "}
                      {new Date(agent.createdAt).toLocaleDateString()}
                    </p>
                    {agent.type && (
                      <span className={`rounded-full px-3 py-0.5 text-xs font-medium border ${TYPE_BADGE_STYLES[agent.type] ?? "bg-white/10 text-white/50 border-white/20"}`}>
                        {agent.type.charAt(0).toUpperCase() + agent.type.slice(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    agent.status === "active"
                      ? "bg-success/15 text-success"
                      : agent.status === "error"
                        ? "bg-red-500/15 text-red-400"
                        : agent.status === "starting"
                          ? "bg-yellow-500/15 text-yellow-400"
                          : "bg-white/10 text-white/50"
                  }`}
                >
                  {agent.status}
                </span>

                {agent.status === "active" && (
                  <Button
                    onClick={handleStop}
                    disabled={stopping}
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Power className="size-4 mr-1" />
                    {stopping ? "Stopping..." : "Unlink Bot"}
                  </Button>
                )}
              </div>
            </div>

            {/* Container info */}
            {agent.containerId && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/40 mb-1">Container</p>
                <p className="text-sm text-white/70 font-mono">
                  {agent.containerId} &middot;
                </p>
              </div>
            )}

            {/* Webhook URL */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/40 mb-1">Webhook URL</p>
              <p className="text-sm text-white/70 font-mono break-all">
                /api/telegram/webhook/{agent.id}
              </p>
            </div>

            <Separator className="bg-white/10" />

            {/* Memory / Context */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Brain className="size-5 text-white/60" />
                  <h2 className="text-lg font-semibold text-white">Context Memory</h2>
                </div>
                {!showClearConfirm ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowClearConfirm(true)}
                    disabled={clearingContext || !memoryStats || memoryStats.totalMessages === 0}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="size-4 mr-1" />
                    Clear Context
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/50">Erase all conversation history?</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearContext}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      Yes, clear
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowClearConfirm(false)}
                      className="text-white/50 hover:text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {memoryStats ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/40 mb-1">Sessions</p>
                    <p className="text-2xl font-bold text-white">{memoryStats.sessionCount}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/40 mb-1">Messages</p>
                    <p className="text-2xl font-bold text-white">{memoryStats.totalMessages}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/40 mb-1">Est. Tokens</p>
                    <p className="text-2xl font-bold text-white">
                      {memoryStats.estimatedTokens >= 1000
                        ? `${(memoryStats.estimatedTokens / 1000).toFixed(1)}k`
                        : memoryStats.estimatedTokens}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-20 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
              )}
            </div>

            <Separator className="bg-white/10" />

            {/* Connected Platforms */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Plug className="size-5 text-white/60" />
                <h2 className="text-lg font-semibold text-white">Connected Platforms</h2>
              </div>

              <div className="space-y-2">
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

                  const handle = isPrimary
                    ? platform === "telegram"
                      ? `@${username}`
                      : username.replace(/^(discord_|whatsapp_)/, "")
                    : channelRecord
                      ? `Added ${new Date(channelRecord.createdAt).toLocaleDateString()}`
                      : null;

                  const PLATFORM_COLORS = {
                    telegram: { ring: "border-[#2AABEE]/20", bg: "bg-[#2AABEE]/5" },
                    discord:  { ring: "border-[#5865F2]/20", bg: "bg-[#5865F2]/5" },
                    whatsapp: { ring: "border-[#25D366]/20", bg: "bg-[#25D366]/5" },
                  };
                  const isWhatsApp = platform === "whatsapp";
                  const colors = isConnected
                    ? PLATFORM_COLORS[platform]
                    : isWhatsApp
                      ? PLATFORM_COLORS.whatsapp
                      : { ring: "border-white/5", bg: "bg-white/[0.02]" };

                  return (
                    <div key={platform}>
                      {/* Row */}
                      <div
                        className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${colors.ring} ${colors.bg} ${!isConnected ? "cursor-pointer hover:border-white/10 hover:bg-white/5" : ""}`}
                        onClick={() => {
                          if (!isConnected) {
                            if (isWhatsApp) { setShowWaModal(true); startWhatsappLink(); }
                            else setExpandedPlatform(isExpanded ? null : platform);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <PlatformIcon platform={platform} />
                          <div>
                            <p className="text-sm text-white font-medium capitalize">
                              {platform === "whatsapp" ? "WhatsApp" : platform.charAt(0).toUpperCase() + platform.slice(1)}
                            </p>
                            {isConnected && handle ? (
                              <p className="text-xs text-white/40">{handle}</p>
                            ) : (
                              <p className="text-xs text-white/30">
                                Not connected · click to connect
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isConnected && agent.status === "active" && (
                            <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">Active</span>
                          )}
                          {isConnected && channelRecord && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteChannel(channelRecord.id); }}
                              className="text-white/20 hover:text-red-400 transition-colors"
                            >
                              <X className="size-4" />
                            </button>
                          )}
                          {!isConnected && (
                            <span className="text-xs text-white/30">{isWhatsApp ? "→" : isExpanded ? "▲" : "▼"}</span>
                          )}
                        </div>
                      </div>

                      {/* Inline connect form */}
                      {isExpanded && !isConnected && (
                        <div className="mt-1 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-4 space-y-3">
                          {platform === "telegram" && (
                            <>
                              <p className="text-xs text-white/40">
                                Create a bot via @BotFather on Telegram, copy the token and username.
                              </p>
                              <Input
                                placeholder="Bot Token (from @BotFather)"
                                value={telegramToken}
                                onChange={(e) => setTelegramToken(e.target.value)}
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                              />
                              <Input
                                placeholder="Bot username (without @)"
                                value={telegramUsername}
                                onChange={(e) => setTelegramUsername(e.target.value)}
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  disabled={addingChannel || !telegramToken || !telegramUsername}
                                  onClick={() => handleAddChannel("telegram", { botToken: telegramToken, botUsername: telegramUsername })}
                                  className="bg-[#2AABEE] hover:bg-[#1e9ad4] text-white"
                                >
                                  {addingChannel ? "Connecting…" : "Connect Telegram"}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setExpandedPlatform(null)} className="text-white/40 hover:text-white">
                                  Cancel
                                </Button>
                              </div>
                            </>
                          )}

                          {platform === "discord" && (
                            <>
                              <p className="text-xs text-white/40">
                                Create a bot at discord.com/developers, copy the bot token, then invite the bot to your server.
                              </p>
                              <Input
                                placeholder="Bot Token"
                                value={discordToken}
                                onChange={(e) => setDiscordToken(e.target.value)}
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  disabled={addingChannel || !discordToken}
                                  onClick={() => handleAddChannel("discord", { botToken: discordToken })}
                                  className="bg-[#5865F2] hover:bg-[#4752c4] text-white"
                                >
                                  {addingChannel ? "Connecting…" : "Connect Discord"}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setExpandedPlatform(null)} className="text-white/40 hover:text-white">
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
            </div>

            <Separator className="bg-white/10" />

            {/* MCP Servers */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Server className="size-5 text-white/60" />
                  <h2 className="text-lg font-semibold text-white">MCP Servers</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddMcp(!showAddMcp)}
                  className="text-white/60 hover:text-white"
                >
                  <Plus className="size-4 mr-1" />
                  Add Server
                </Button>
              </div>

              {showAddMcp && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-4 space-y-4">
                  {/* Templates */}
                  <div>
                    <p className="text-xs text-white/40 mb-2">Quick templates</p>
                    <div className="flex flex-wrap gap-2">
                      {MCP_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.name}
                          onClick={() => applyMcpTemplate(tpl)}
                          className="px-2 py-1 rounded text-xs bg-white/10 text-white/60 hover:text-white hover:bg-white/15 transition-colors"
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
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />

                  {/* Transport selector */}
                  <div className="flex gap-2">
                    {(["http", "stdio"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setMcpTransport(t)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          mcpTransport === t
                            ? "bg-brand text-white"
                            : "bg-white/10 text-white/50 hover:text-white"
                        }`}
                      >
                        {t === "http" ? "HTTP / SSE" : "Stdio (local)"}
                      </button>
                    ))}
                  </div>

                  {mcpTransport === "http" ? (
                    <Input
                      placeholder="Server URL (https://...)"
                      value={mcpUrl}
                      onChange={(e) => setMcpUrl(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        {["npx", "node", "python3"].map((cmd) => (
                          <button
                            key={cmd}
                            onClick={() => setMcpCommand(cmd)}
                            className={`px-2 py-0.5 rounded text-xs transition-colors ${
                              mcpCommand === cmd
                                ? "bg-brand/30 text-brand border border-brand/30"
                                : "bg-white/10 text-white/50 hover:text-white"
                            }`}
                          >
                            {cmd}
                          </button>
                        ))}
                      </div>
                      <Input
                        placeholder="Args (e.g. @notionhq/mcp --token TOKEN)"
                        value={mcpArgs}
                        onChange={(e) => setMcpArgs(e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddMcp}
                      disabled={addingMcp || !mcpName}
                      className="bg-brand hover:bg-brand/90 text-white"
                    >
                      {addingMcp ? "Adding..." : "Add Server"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAddMcp(false)}
                      className="text-white/50 hover:text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Existing MCP servers */}
              <div className="space-y-2">
                {mcpServers.map((srv) => (
                  <div key={srv.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Server className="size-4 text-white/40" />
                      <div>
                        <p className="text-sm text-white font-medium">{srv.serverName}</p>
                        <p className="text-xs text-white/40 font-mono">{srv.transport}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleMcp(srv.id, !srv.enabled)}
                        className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                          srv.enabled
                            ? "bg-success/10 text-success hover:bg-red-500/10 hover:text-red-400"
                            : "bg-white/10 text-white/40 hover:bg-success/10 hover:text-success"
                        }`}
                      >
                        {srv.enabled ? "Enabled" : "Disabled"}
                      </button>
                      <button
                        onClick={() => handleDeleteMcp(srv.id)}
                        className="text-white/30 hover:text-red-400 transition-colors"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {mcpServers.length === 0 && (
                  <p className="text-sm text-white/30 py-2">No MCP servers configured.</p>
                )}
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Activity log */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">
                Activity Log
              </h2>

              {activities.length === 0 ? (
                <p className="text-sm text-white/40">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3"
                    >
                      <div
                        className={`mt-0.5 size-2 rounded-full shrink-0 ${
                          activity.type === "error"
                            ? "bg-red-400"
                            : activity.type === "launch"
                              ? "bg-success"
                              : activity.type === "stop"
                                ? "bg-white/30"
                                : "bg-brand"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/70">
                          {activity.message}
                        </p>
                        <p className="text-xs text-white/30 mt-1">
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* WhatsApp QR linking modal */}
      {showWaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl">
            <button
              onClick={cancelWhatsappLink}
              className="absolute right-4 top-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <PlatformIcon platform="whatsapp" />
              <h2 className="text-lg font-semibold text-white">Link WhatsApp</h2>
            </div>

            {waLinkStatus === "starting" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <RefreshCw className="size-8 animate-spin text-[#25D366]" />
                <p className="text-sm text-white/60 text-center">
                  Starting WhatsApp pairing session…
                </p>
              </div>
            )}

            {waLinkStatus === "qr_ready" && waQrData && (
              <div className="flex flex-col items-center gap-4">
                <p className="text-xs text-white/50 text-center">
                  Open WhatsApp on your phone → Linked Devices → Link a Device → scan this QR code
                </p>
                <div className="rounded-xl bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(waQrData)}`}
                    alt="WhatsApp QR code"
                    width={220}
                    height={220}
                    className="block"
                  />
                </div>
                <p className="text-xs text-white/30 text-center">QR code refreshes every ~60 seconds</p>
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <RefreshCw className="size-3 animate-spin" />
                  Waiting for scan…
                </div>
              </div>
            )}

            {waLinkStatus === "linked" && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="flex size-16 items-center justify-center rounded-full bg-[#25D366]/15">
                  <PlatformIcon platform="whatsapp" />
                </div>
                <p className="text-base font-semibold text-white">WhatsApp Linked!</p>
                <p className="text-sm text-white/50 text-center">
                  Your agent can now receive and send WhatsApp messages.
                </p>
                <Button
                  size="sm"
                  onClick={() => { setShowWaModal(false); setWaLinkStatus("idle"); }}
                  className="bg-[#25D366] hover:bg-[#20bd5a] text-white"
                >
                  Done
                </Button>
              </div>
            )}

            {waLinkStatus === "failed" && (
              <div className="flex flex-col items-center gap-4 py-6">
                <p className="text-sm text-red-400 text-center">{waError ?? "Linking failed"}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={startWhatsappLink} className="bg-brand hover:bg-brand/90 text-white">
                    Retry
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelWhatsappLink} className="text-white/50 hover:text-white">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </SidebarInset>
  );
}
