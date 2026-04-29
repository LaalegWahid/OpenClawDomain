"use client";

import { useState, useRef, useCallback, useLayoutEffect, useEffect } from "react";
import { Send, RotateCcw, Square, Settings } from "lucide-react";

const ACCENT = "#FF4D00";
const mono = "var(--mono), 'JetBrains Mono', monospace";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  telegramDelivered?: boolean;
}

const TEXTAREA_LINE_HEIGHT = 18;
const TEXTAREA_MAX_HEIGHT = TEXTAREA_LINE_HEIGHT * 10 + 20;
const STORAGE_KEY = "sim:rob:chat";
const TG_KEY = "sim:rob:telegramChatId";

export function SimChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load history + telegram chat id from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw));
      const tg = localStorage.getItem(TG_KEY);
      if (tg) setTelegramChatId(tg);
    } catch { /* ignore */ }
  }, []);

  // Persist history
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    try { localStorage.setItem(TG_KEY, telegramChatId); } catch { /* ignore */ }
  }, [telegramChatId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  // Auto-grow textarea
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }, [input]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setError(null);
    setSending(true);

    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/sim/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          telegramChatId: telegramChatId.trim() || undefined,
        }),
        signal: controller.signal,
      });
      const data: { reply?: string; error?: string; telegramDelivered?: boolean } =
        await res.json().catch(() => ({}));

      if (!res.ok || !data.reply) {
        setError(data.error ?? `Request failed (HTTP ${res.status})`);
        return;
      }

      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.reply!,
        telegramDelivered: data.telegramDelivered,
      }]);
    } catch (err) {
      if (controller.signal.aborted) {
        // user cancelled — leave the user message in place
        return;
      }
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      abortRef.current = null;
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [input, sending, messages, telegramChatId]);

  const handleCancel = () => abortRef.current?.abort();

  const handleReset = () => {
    setMessages([]);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: 10 }}>
      {/* Settings + reset row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => setShowSettings((v) => !v)}
          title="Telegram delivery settings"
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8,
            background: "var(--surface)", cursor: "pointer",
            fontFamily: mono, fontSize: 10, fontWeight: 500,
            letterSpacing: "0.06em", textTransform: "uppercase",
            color: "var(--foreground-2)",
          }}
        >
          <Settings size={11} />
          Telegram
          {telegramChatId && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />}
        </button>
        {messages.length > 0 && (
          <button
            onClick={handleReset}
            title="Clear conversation"
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8,
              background: "var(--surface)", cursor: "pointer",
              fontFamily: mono, fontSize: 10, fontWeight: 500,
              letterSpacing: "0.06em", textTransform: "uppercase",
              color: "var(--foreground-2)",
            }}
          >
            <RotateCcw size={11} />
            Reset
          </button>
        )}
      </div>

      {showSettings && (
        <div style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 10, fontFamily: mono, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--foreground-3)" }}>
            Telegram Chat ID
          </label>
          <input
            type="text"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            placeholder="e.g. 123456789"
            style={{
              padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)",
              background: "var(--surface-2)", fontFamily: mono, fontSize: 12,
              color: "var(--foreground)", outline: "none",
            }}
          />
          <p style={{ margin: 0, fontFamily: mono, fontSize: 10, color: "var(--foreground-3)", lineHeight: 1.5 }}>
            DM <strong>@ClawMananger03_bot</strong> on Telegram, then visit{" "}
            <code>https://api.telegram.org/bot&lt;token&gt;/getUpdates</code>{" "}
            to find your chat ID. Each reply will be mirrored to that chat.
          </p>
        </div>
      )}

      {/* Chat surface */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        border: "1px solid var(--border)", borderRadius: 12,
        background: "var(--surface)", overflow: "hidden", minHeight: 0,
      }}>
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12, minHeight: 280 }}>
          {messages.length === 0 && !sending && (
            <p style={{ textAlign: "center", fontFamily: mono, fontSize: 13, color: "var(--foreground-3)", marginTop: "2.5rem", padding: "0 1rem" }}>
              Ask Rob about a setup, risk, or strategy
            </p>
          )}

          {messages.map((msg, i) => (
            <Bubble key={i} msg={msg} />
          ))}

          {sending && <Thinking />}
        </div>

        {error && (
          <div style={{
            padding: "8px 16px", fontFamily: mono, fontSize: 12,
            color: "#dc2626", background: "rgba(220,38,38,0.06)",
            borderTop: "1px solid rgba(220,38,38,0.15)", flexShrink: 0,
          }}>
            {error}
          </div>
        )}

        <div style={{
          borderTop: "1px solid var(--border)", padding: 12,
          display: "flex", gap: 10, alignItems: "flex-end", flexShrink: 0,
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={sending}
            rows={1}
            style={{
              flex: 1, resize: "none",
              background: "var(--surface-2)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "10px 14px",
              fontFamily: mono, fontSize: 13, lineHeight: `${TEXTAREA_LINE_HEIGHT}px`,
              color: "var(--foreground)",
              outline: "none",
              maxHeight: TEXTAREA_MAX_HEIGHT, overflowY: "auto",
              opacity: sending ? 0.4 : 1,
              cursor: sending ? "not-allowed" : "text",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = ACCENT; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          />
          {sending ? (
            <button
              onClick={handleCancel}
              title="Stop generating"
              style={{
                background: ACCENT, color: "#fff",
                border: "none", borderRadius: 8,
                padding: "10px 14px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <Square size={14} fill="#fff" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              style={{
                background: !input.trim() ? "var(--surface-2)" : ACCENT,
                color: !input.trim() ? "var(--foreground-3)" : "#fff",
                border: "none", borderRadius: 8,
                padding: "10px 14px",
                cursor: !input.trim() ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes oc-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div style={{
        maxWidth: "80%",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
        fontFamily: mono,
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        ...(isUser
          ? { background: "rgba(255,77,0,0.08)", color: "var(--foreground)", border: "1px solid rgba(255,77,0,0.15)" }
          : { background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }),
      }}>
        {msg.content}
        {!isUser && msg.telegramDelivered && (
          <div style={{ marginTop: 6, fontSize: 10, color: "#16a34a", fontFamily: mono, letterSpacing: "0.04em" }}>
            ✓ delivered to Telegram
          </div>
        )}
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <div style={{
        background: "var(--surface-2)", border: "1px solid var(--border)",
        borderRadius: 10, padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 4,
      }}>
        {[0, 150, 300].map((delay) => (
          <span key={delay} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--foreground-3)",
            animation: "oc-bounce 1s infinite",
            animationDelay: `${delay}ms`,
          }} />
        ))}
      </div>
    </div>
  );
}
