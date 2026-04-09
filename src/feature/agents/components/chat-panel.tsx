"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, Send, ChevronDown, ChevronUp, Download } from "lucide-react";
import { Button } from "../../../shared/components/ui/button";

interface ChatDocument {
  data: string;
  filename: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  document?: ChatDocument;
}

interface ChatPanelProps {
  agentId: string;
  agentName: string;
  agentStatus: string;
}

export function ChatPanel({ agentId, agentName, agentStatus }: ChatPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isActive = agentStatus === "active";

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Load history when expanded for the first time
  useEffect(() => {
    if (!expanded || loaded) return;
    fetch(`/api/agents/${agentId}/chat`)
      .then((res) => res.json())
      .then((data) => {
        if (data.history) setMessages(data.history);
        setLoaded(true);
      })
      .catch(() => setError("Failed to load chat history"));
  }, [expanded, loaded, agentId]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !isActive) return;

    setInput("");
    setError(null);
    setSending(true);

    // Optimistic: add user message immediately
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const res = await fetch(`/api/agents/${agentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send message");
        // Remove optimistic message on error
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.document ? "Your document is ready." : data.reply,
        document: data.document ?? undefined,
      }]);
    } catch {
      setError("Failed to reach the server");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [input, sending, isActive, agentId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-white/60" />
          <h2 className="text-lg font-semibold text-white">Chat</h2>
          {!isActive && (
            <span className="text-xs text-white/30 ml-2">
              Agent is {agentStatus}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="size-4 text-white/40" />
        ) : (
          <ChevronDown className="size-4 text-white/40" />
        )}
      </button>

      {/* Expandable chat area */}
      {expanded && (
        <>
          {/* Messages */}
          <div
            ref={scrollRef}
            className="h-96 overflow-y-auto border-t border-white/10 px-4 py-3 space-y-3"
          >
            {messages.length === 0 && !sending && (
              <p className="text-center text-sm text-white/20 mt-8">
                {isActive
                  ? `Send a message to ${agentName}`
                  : `Agent is ${agentStatus} — chat unavailable`}
              </p>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                    msg.role === "user"
                      ? "bg-brand/15 text-white border border-brand/20"
                      : "bg-white/5 text-white/80 border border-white/10"
                  }`}
                >
                  {msg.content}
                  {msg.document && (
                    <a
                      href={`data:application/pdf;base64,${msg.document.data}`}
                      download={msg.document.filename}
                      className="mt-2 flex items-center gap-2 rounded-md border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs text-white hover:bg-brand/20 transition-colors w-fit"
                    >
                      <Download className="size-3.5" />
                      {msg.document.filename}
                    </a>
                  )}
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="size-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="size-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-2 text-xs text-red-400 bg-red-500/5 border-t border-red-500/10">
              {error}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-white/10 p-3 flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isActive ? "Type a message..." : `Agent is ${agentStatus}`}
              disabled={!isActive || sending}
              rows={1}
              className="flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand/40 disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!input.trim() || sending || !isActive}
              className="bg-brand hover:bg-brand/80 text-white px-3"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
