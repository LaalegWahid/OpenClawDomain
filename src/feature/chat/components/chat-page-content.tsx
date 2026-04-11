"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Download, Bot, ChevronDown, RotateCcw } from "lucide-react";

const mono = "var(--mono), 'JetBrains Mono', monospace";

interface ChatDocument {
  data: string;
  filename: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  document?: ChatDocument;
}

interface AgentOption {
  id: string;
  name: string;
  status: string;
  type?: string;
}

export function ChatPageContent({ defaultAgentId, hideHeader = false }: { defaultAgentId?: string; hideHeader?: boolean } = {}) {
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(defaultAgentId || "");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedAgent = defaultAgentId
    ? { id: defaultAgentId, name: "Agent", status: "active", type: "default" }
    : agents.find((a) => a.id === selectedAgentId);
  const isActive = selectedAgent?.status === "active";

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Load agents list
  useEffect(() => {
    if (defaultAgentId) {
      setLoadingAgents(false);
      return;
    }
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => {
        const list: AgentOption[] = (data.agents ?? []).map(
          (a: { id: string; name: string; status: string; type?: string }) => ({
            id: a.id, name: a.name, status: a.status, type: a.type,
          }),
        );
        setAgents(list);
        const active = list.find((a) => a.status === "active");
        if (active) setSelectedAgentId(active.id);
        else if (list.length > 0) setSelectedAgentId(list[0].id);
      })
      .catch(() => setError("Failed to load agents"))
      .finally(() => setLoadingAgents(false));
  }, [defaultAgentId]);

  // Load chat history when agent changes
  useEffect(() => {
    if (!selectedAgentId) return;
    setMessages([]);
    setError(null);
    fetch(`/api/agents/${selectedAgentId}/chat`)
      .then((r) => r.json())
      .then((data) => {
        if (data.history) setMessages(data.history);
      })
      .catch(() => setError("Failed to load chat history"));
  }, [selectedAgentId]);

  // Auto-scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !isActive || !selectedAgentId) return;

    setInput("");
    setError(null);
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const res = await fetch(`/api/agents/${selectedAgentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send message");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.document ? "Your document is ready." : data.reply,
          document: data.document ?? undefined,
        },
      ]);
    } catch {
      setError("Failed to reach the server");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [input, sending, isActive, selectedAgentId]);

  const handleReset = async () => {
    if (!selectedAgentId) return;
    try {
      await fetch(`/api/agents/${selectedAgentId}/chat`, { method: "DELETE" });
      setMessages([]);
    } catch {
      setError("Failed to clear conversation");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loadingAgents) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5rem 0" }}>
        <div style={{
          width: 24, height: 24, border: "2px solid var(--border)",
          borderTopColor: "#FF4D00", borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }} />
      </div>
    );
  }

  if (!defaultAgentId && agents.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
        <Bot size={48} color="var(--foreground-3)" style={{ margin: "0 auto 1rem" }} />
        <p style={{ fontFamily: mono, fontSize: 13, color: "var(--foreground-3)" }}>
          No agents found. Create one from the dashboard first.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, flex: 1 }}>
      {/* Agent selector + reset */}
      {!hideHeader && (
        <div style={{ marginBottom: 12, flexShrink: 0, display: "flex", alignItems: "flex-end", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{
              display: "block", fontFamily: mono, fontSize: 10, fontWeight: 500,
              letterSpacing: "0.06em", textTransform: "uppercase",
              color: "var(--foreground-3)", marginBottom: 6,
            }}>
              Agent
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                style={{
                  width: "100%", appearance: "none",
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "9px 36px 9px 12px",
                  fontFamily: mono, fontSize: 13, color: "var(--foreground)",
                  outline: "none", cursor: "pointer",
                }}
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.status}{a.type ? ` (${a.type})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} color="var(--foreground-3)" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleReset}
              title="Clear conversation"
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "9px 14px", border: "1px solid var(--border)", borderRadius: 8,
                background: "var(--surface)", cursor: "pointer",
                fontFamily: mono, fontSize: 11, fontWeight: 500,
                letterSpacing: "0.04em", textTransform: "uppercase",
                color: "var(--foreground-2)", transition: "border-color 0.15s",
                flexShrink: 0,
              }}
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}
        </div>
      )}

      {/* Reset button when hideHeader but messages exist */}
      {hideHeader && messages.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10, flexShrink: 0 }}>
          <button
            onClick={handleReset}
            title="Clear conversation"
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "7px 12px", border: "1px solid var(--border)", borderRadius: 8,
              background: "var(--surface)", cursor: "pointer",
              fontFamily: mono, fontSize: 10, fontWeight: 500,
              letterSpacing: "0.04em", textTransform: "uppercase",
              color: "var(--foreground-2)", transition: "border-color 0.15s",
            }}
          >
            <RotateCcw size={11} />
            Reset
          </button>
        </div>
      )}

      {/* Chat area */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        border: "1px solid var(--border)", borderRadius: 12,
        background: "var(--surface)", overflow: "hidden", minHeight: 0,
      }}>
        {/* Messages */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.length === 0 && !sending && (
            <p style={{
              textAlign: "center", fontFamily: mono, fontSize: 13,
              color: "var(--foreground-3)", marginTop: "3rem", padding: "0 1rem",
            }}>
              {isActive
                ? `Send a message to ${selectedAgent?.name}`
                : selectedAgent
                  ? `Agent is ${selectedAgent.status} — chat unavailable`
                  : "Select an agent to start chatting"}
            </p>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "80%",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 13,
                fontFamily: mono,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                ...(msg.role === "user"
                  ? {
                      background: "rgba(255,77,0,0.08)",
                      color: "var(--foreground)",
                      border: "1px solid rgba(255,77,0,0.15)",
                    }
                  : {
                      background: "var(--surface-2)",
                      color: "var(--foreground)",
                      border: "1px solid var(--border)",
                    }),
              }}>
                {msg.content}
                {msg.document && (
                  <a
                    href={msg.document.data}
                    download={msg.document.filename}
                    style={{
                      marginTop: 8, display: "flex", alignItems: "center", gap: 6,
                      borderRadius: 6, border: "1px solid rgba(255,77,0,0.25)",
                      background: "rgba(255,77,0,0.06)", padding: "6px 10px",
                      fontSize: 11, color: "#FF4D00", textDecoration: "none",
                      width: "fit-content", transition: "background 0.15s",
                    }}
                  >
                    <Download size={13} />
                    {msg.document.filename}
                  </a>
                )}
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {sending && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "12px 16px",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--foreground-3)", animation: "bounce 1s infinite", animationDelay: "0ms" }} />
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--foreground-3)", animation: "bounce 1s infinite", animationDelay: "150ms" }} />
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--foreground-3)", animation: "bounce 1s infinite", animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "8px 16px", fontFamily: mono, fontSize: 12,
            color: "var(--error)", background: "rgba(226,61,45,0.06)",
            borderTop: "1px solid rgba(226,61,45,0.15)", flexShrink: 0,
          }}>
            {error}
          </div>
        )}

        {/* Input */}
        <div style={{
          borderTop: "1px solid var(--border)", padding: 12,
          display: "flex", gap: 10, alignItems: "flex-end", flexShrink: 0,
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isActive
                ? "Type your message..."
                : selectedAgent
                  ? `Agent is ${selectedAgent.status}`
                  : "Select an agent"
            }
            disabled={!isActive || sending}
            rows={1}
            style={{
              flex: 1, resize: "none",
              background: "var(--surface-2)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "10px 14px",
              fontFamily: mono, fontSize: 13, color: "var(--foreground)",
              outline: "none", maxHeight: 128, overflowY: "auto",
              transition: "border-color 0.15s",
              opacity: (!isActive || sending) ? 0.4 : 1,
              cursor: (!isActive || sending) ? "not-allowed" : "text",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#FF4D00"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || !isActive}
            style={{
              background: (!input.trim() || sending || !isActive) ? "var(--surface-2)" : "#FF4D00",
              color: (!input.trim() || sending || !isActive) ? "var(--foreground-3)" : "#fff",
              border: "none", borderRadius: 8,
              padding: "10px 14px", cursor: (!input.trim() || sending || !isActive) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 0.15s",
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
