export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111111",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        textAlign: "center",
        gap: "18px",
        padding: "2rem",
      }}
    >
      {/* 404 indicator */}
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "12px",
          border: "0.5px solid rgba(255,77,0,0.25)",
          background: "rgba(255,77,0,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          fontWeight: 600,
          color: "#FF4D00",
          letterSpacing: "-0.02em",
        }}
      >
        404
      </div>

      {/* Text */}
      <div>
        <div
          style={{
            fontSize: "clamp(1.3rem, 3vw, 1.7rem)",
            fontWeight: 500,
            letterSpacing: "-0.03em",
            color: "#F0EEE8",
            marginBottom: "6px",
          }}
        >
          Page not found
        </div>

        <div
          style={{
            fontSize: "13px",
            color: "#555555",
            lineHeight: 1.6,
            maxWidth: "340px",
          }}
        >
          The page you're looking for doesn't exist or may have been moved.
        </div>
      </div>

      {/* Button */}
      <a
        href="/overview"
        style={{
          background: "#FF4D00",
          color: "#fff",
          borderRadius: "8px",
          padding: "10px 16px",
          fontSize: "13px",
          fontWeight: 500,
          textDecoration: "none",
          letterSpacing: "-0.01em",
          border: "none",
          display: "inline-block",
          marginTop: "6px",
        }}
      >
        Back to dashboard →
      </a>
    </div>
  );
}