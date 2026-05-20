const syne = "'Syne', sans-serif";
const mono = "'JetBrains Mono', monospace";

export default function Loading() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2rem",
        background: "#f8f2ed",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Soft radial glow behind the mark */}
      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,77,0,0.12) 0%, transparent 70%)",
          animation: "ocGlow 3s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Logo mark with orbiting ring */}
      <div style={{ position: "relative", zIndex: 2, width: 96, height: 96 }}>
        {/* Spinning ring */}
        <svg
          width="96"
          height="96"
          viewBox="0 0 96 96"
          style={{ position: "absolute", inset: 0, animation: "ocSpin 1.1s linear infinite" }}
        >
          <circle
            cx="48"
            cy="48"
            r="44"
            fill="none"
            stroke="rgba(42,31,25,0.08)"
            strokeWidth="2"
          />
          <circle
            cx="48"
            cy="48"
            r="44"
            fill="none"
            stroke="#FF4D00"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="70 210"
          />
        </svg>

        {/* Logo */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "ocPulse 2s ease-in-out infinite",
          }}
        >
          <svg width="44" height="44" viewBox="0 0 56 56" fill="none">
            <rect width="56" height="56" rx="12" fill="#FF4D00" />
            <line x1="15" y1="40" x2="23" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
            <line x1="24" y1="40" x2="32" y2="12" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
            <line x1="33" y1="40" x2="41" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
          </svg>
        </div>
      </div>

      {/* Wordmark */}
      <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
        <span
          style={{
            fontFamily: syne,
            fontWeight: 800,
            fontSize: 22,
            color: "#1a1209",
            letterSpacing: "-0.02em",
          }}
        >
          Open<span style={{ color: "#FF4D00" }}>Claw</span>
        </span>
        <p
          style={{
            margin: "8px 0 0",
            fontFamily: mono,
            fontSize: 11,
            color: "#8a7060",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            animation: "ocFade 1.6s ease-in-out infinite",
          }}
        >
          Loading
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Syne:wght@800&display=swap');

        @keyframes ocSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes ocPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.92); }
        }
        @keyframes ocGlow {
          0%, 100% { opacity: 0.5; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes ocFade {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </main>
  );
}
