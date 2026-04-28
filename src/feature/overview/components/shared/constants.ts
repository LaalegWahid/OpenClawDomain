export const mono  = "var(--mono), 'JetBrains Mono', monospace";
export const serif = "var(--serif), 'Cormorant Garamond', Georgia, serif";
export const ACCENT = "#FF4D00";

export const skeleton: React.CSSProperties = {
  background: "linear-gradient(90deg, #ede8e0 25%, #e4ddd4 50%, #ede8e0 75%)",
  backgroundSize: "600px 100%",
  animation: "shimmer 1.4s infinite",
  borderRadius: 6,
};

export const inputStyle: React.CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  padding: "11px 14px",
  fontSize: "13px",
  fontFamily: mono,
  color: "var(--foreground)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

export const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  fontFamily: mono,
  color: "var(--foreground-2)",
  textTransform: "uppercase",
  display: "flex",
};

const TYPE_COLORS: Record<string, string> = {
  finance: "#4CAF50",
  marketing: "#2196F3",
  operations: "#FF9800",
};

const DEFAULT_CUSTOM_COLOR = "#9C27B0";

export function getTypeColor(type?: string): string {
  return (type && TYPE_COLORS[type]) || DEFAULT_CUSTOM_COLOR;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "active": return "#4CAF50";
    case "starting": return "#FFC107";
    case "error": return "#F44336";
    default: return "#555555";
  }
}

export type Platform = "telegram" | "discord" | "whatsapp";

export const PLATFORM_OPTIONS: { value: Platform; label: string; description: string }[] = [
  { value: "telegram", label: "Telegram", description: "Connect via Telegram Bot API" },
  { value: "discord",  label: "Discord",  description: "Connect via Discord bot" },
  { value: "whatsapp", label: "WhatsApp", description: "Link your WhatsApp account via QR scan" },
];

export const PLATFORM_ACTIVE_COLORS: Record<Platform, { border: string; bg: string; label: string }> = {
  telegram: { border: "rgba(42,171,238,0.5)",  bg: "rgba(42,171,238,0.08)", label: "#2AABEE" },
  discord:  { border: "rgba(88,101,242,0.5)",  bg: "rgba(88,101,242,0.08)", label: "#5865F2" },
  whatsapp: { border: "rgba(37,211,102,0.5)",  bg: "rgba(37,211,102,0.08)", label: "#25D366" },
};
