"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Download, Bot, ChevronDown } from "lucide-react";
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

interface AgentOption {
  id: string;
  name: string;
  status: string;
  type?: string;
}

export function ChatPageContent() {
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const isActive = selectedAgent?.status === "active";

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Load agents list
  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => {
        const list: AgentOption[] = (data.agents ?? []).map(
          (a: { id: string; name: string; status: string; type?: string }) => ({
            id: a.id,
            name: a.name,
            status: a.status,
            type: a.type,
          }),
        );
        setAgents(list);
        // Auto-select first active agent
        const active = list.find((a) => a.status === "active");
        if (active) setSelectedAgentId(active.id);
        else if (list.length > 0) setSelectedAgentId(list[0].id);
      })
      .catch(() => setError("Failed to load agents"))
      .finally(() => setLoadingAgents(false));
  }, []);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

// Key responsive improvements:
// 1. h-[calc(100vh-120px)] → flex-based height that adapts to mobile
// 2. Agent selector uses tighter padding on small screens
// 3. Message bubbles use responsive max-width (95% on mobile, 80% on desktop)
// 4. Input area stacks better on small screens
// 5. Added min-h-0 to prevent flex overflow
// 6. Used clamp-friendly sizing throughout

if (loadingAgents) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="size-6 animate-spin rounded-full border-2 border-white/20 border-t-brand" />
    </div>
  );
}

if (agents.length === 0) {
  return (
    <div className="text-center py-20 px-4">
      <Bot className="size-12 text-white/20 mx-auto mb-4" />
      <p className="text-white/40 text-sm">No agents found. Create one from the dashboard first.</p>
    </div>
  );
}

return (
  <div className="flex flex-col h-[calc(100dvh-120px)] min-h-0">
    {/* Agent selector */}
    <div className="mb-3 flex-shrink-0">
      <label className="block text-xs text-white/40 mb-1.5">Agent</label>
      <div className="relative">
        <select
          value={selectedAgentId}
          onChange={(e) => setSelectedAgentId(e.target.value)}
          className="w-full appearance-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 sm:px-4 sm:py-2.5 pr-9 text-sm text-white focus:outline-none focus:border-brand/40"
        >
          {agents.map((a) => (
            <option key={a.id} value={a.id} className="bg-zinc-900 text-white">
              {a.name} — {a.status}{a.type ? ` (${a.type})` : ""}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
      </div>
    </div>

    {/* Chat area */}
    <div className="flex-1 flex flex-col rounded-xl border border-white/10 bg-white/5 overflow-hidden min-h-0">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3">
        {messages.length === 0 && !sending && (
          <p className="text-center text-sm text-white/20 mt-8 px-4">
            {isActive
              ? `Send a message to ${selectedAgent?.name}`
              : selectedAgent
                ? `Agent is ${selectedAgent.status} — chat unavailable`
                : "Select an agent to start chatting"}
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[95%] sm:max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                msg.role === "user"
                  ? "bg-brand/15 text-white border border-brand/20"
                  : "bg-white/5 text-white/80 border border-white/10"
              }`}
            >
              {msg.content}
              {msg.document && (
                
                 <a href={msg.document.data}
                  download={msg.document.filename}
                  className="mt-2 flex items-center gap-2 rounded-md border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs text-white hover:bg-brand/20 active:bg-brand/30 transition-colors w-fit"
                >
                  <Download className="size-3.5 flex-shrink-0" />
                  <span className="truncate max-w-[180px] sm:max-w-none">{msg.document.filename}</span>
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
        <div className="px-3 sm:px-4 py-2 text-xs text-red-400 bg-red-500/5 border-t border-red-500/10 flex-shrink-0">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-white/10 p-2 sm:p-3 flex gap-2 items-end flex-shrink-0">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isActive
              ? "Type a message..."
              : selectedAgent
                ? `Agent is ${selectedAgent.status}`
                : "Select an agent"
          }
          disabled={!isActive || sending}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand/40 disabled:opacity-40 disabled:cursor-not-allowed max-h-32 overflow-y-auto"
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!input.trim() || sending || !isActive}
          className="bg-brand hover:bg-brand/80 active:bg-brand/60 text-white px-3 flex-shrink-0 touch-manipulation"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  </div>
);
}
