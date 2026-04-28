export const mono  = "var(--mono), 'JetBrains Mono', monospace";
export const serif = "var(--serif), 'Cormorant Garamond', Georgia, serif";
export const ACCENT = "#FF4D00";

export const SOURCE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  chat_ui:  { bg: "rgba(33,150,243,0.10)", color: "#2196F3", label: "Chat UI" },
  telegram: { bg: "rgba(42,171,238,0.10)", color: "#2AABEE", label: "Telegram" },
  discord:  { bg: "rgba(88,101,242,0.10)", color: "#5865F2", label: "Discord" },
  whatsapp: { bg: "rgba(37,211,102,0.10)", color: "#25D366", label: "WhatsApp" },
};

export const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  running:   { bg: "rgba(255,152,0,0.10)", color: "#FF9800" },
  completed: { bg: "rgba(76,175,80,0.10)",  color: "#4CAF50" },
  aborted:   { bg: "rgba(244,67,54,0.10)",  color: "#F44336" },
  error:     { bg: "rgba(244,67,54,0.10)",  color: "#F44336" },
};
