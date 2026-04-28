const serif = "var(--serif), 'Cormorant Garamond', Georgia, serif";
const mono = "var(--mono), 'JetBrains Mono', monospace";

export default function Loading() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f8f2ed",
        color: "#2a1f19",
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: 420,
          padding: "2.5rem 2rem",
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "0.5px solid rgba(42,31,25,0.15)",
          borderRadius: 16,
          boxShadow: "0 4px 24px rgba(42,31,25,0.07)",
        }}
      >
        {/* Brand mark */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <svg width="36" height="36" viewBox="0 0 56 56" fill="none">
            <rect width="56" height="56" rx="13" fill="#FF4D00" />
            <line x1="15" y1="40" x2="23" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
            <line x1="24" y1="40" x2="32" y2="12" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
            <line x1="33" y1="40" x2="41" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
          </svg>
          <span style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1 }}>
            Open<span style={{ color: "#FF4D00" }}>Claw</span>
          </span>
        </div>

        <div
          style={{
            width: 32,
            height: 32,
            margin: "0 auto 18px",
            border: "2.5px solid rgba(42,31,25,0.12)",
            borderTopColor: "#FF4D00",
            borderRadius: "50%",
            animation: "loadingSpin 0.9s linear infinite",
          }}
        />
        <h1
          style={{
            fontFamily: serif,
            fontSize: "1.6rem",
            fontWeight: 600,
            margin: "0 0 8px",
            color: "#2a1f19",
            letterSpacing: "-0.02em",
          }}
        >
          Initialising <em style={{ fontStyle: "italic", color: "#FF4D00" }}>workspace...</em>
        </h1>
        <p style={{ fontFamily: mono, fontSize: 12, color: "#8a7060", margin: 0, lineHeight: 1.6 }}>
          Preparing your workspace.
        </p>
      </div>

      <style>{`@keyframes loadingSpin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
