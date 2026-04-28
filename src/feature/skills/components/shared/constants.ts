export const ACCENT = "#FF4D00";

export const skeleton: React.CSSProperties = {
  background: "linear-gradient(90deg, #ede8e0 25%, #e4ddd4 50%, #ede8e0 75%)",
  backgroundSize: "600px 100%",
  animation: "shimmer 1.4s infinite",
  borderRadius: 6,
};

export const SOURCE_COLORS: Record<string, string> = {
  ai: "#9C27B0",
  manual: "#2196F3",
  import: "#4CAF50",
};

export const SOURCE_LABELS: Record<string, string> = {
  ai: "AI Generated",
  manual: "Manual",
  import: "Imported",
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 12px",
  color: "var(--foreground)",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

export const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "var(--foreground-3)",
  marginBottom: 6,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.02em",
};

export const SUPPORTED_PROVIDERS = ["anthropic", "openai", "openrouter", "google"] as const;
