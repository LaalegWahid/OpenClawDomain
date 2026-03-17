export default function loading(){
      
 return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111111",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      {/* Loader */}
      <div
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          border: "2px solid #1E1E1E",
          borderTop: "2px solid #FF4D00",
          animation: "spin 0.9s linear infinite",
        }}
      />

      {/* Text */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: "14px",
            color: "#F0EEE8",
            letterSpacing: "-0.01em",
            marginBottom: "4px",
          }}
        >
          Initialising agents
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "#555555",
          }}
        >
          Preparing your workspace...
        </div>
      </div>

      <style>
        {`
        @keyframes spin {
          0% { transform: rotate(0deg) }
          100% { transform: rotate(360deg) }
        }
        `}
      </style>
    </div>
  );
}
