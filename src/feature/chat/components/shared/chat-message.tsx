import { Download } from "lucide-react";
import { ACCENT, mono } from "./constants";
import type { ChatMessage as ChatMessageT } from "./types";

export function ChatMessage({ msg }: { msg: ChatMessageT }) {
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
        {msg.document && (
          <a
            href={msg.document.data}
            download={msg.document.filename}
            style={{
              marginTop: 8, display: "flex", alignItems: "center", gap: 6,
              borderRadius: 6, border: "1px solid rgba(255,77,0,0.25)",
              background: "rgba(255,77,0,0.06)", padding: "6px 10px",
              fontSize: 11, color: ACCENT, textDecoration: "none",
              width: "fit-content", transition: "background 0.15s",
            }}
          >
            <Download size={13} />
            {msg.document.filename}
          </a>
        )}
      </div>
    </div>
  );
}
