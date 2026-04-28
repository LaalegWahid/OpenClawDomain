export function ThinkingIndicator() {
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
            animation: "bounce 1s infinite",
            animationDelay: `${delay}ms`,
          }} />
        ))}
      </div>
    </div>
  );
}
