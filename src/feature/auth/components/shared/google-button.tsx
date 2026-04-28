import { mono } from "./constants";
import { GoogleIcon } from "./google-icon";

export function GoogleButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="oc-google-btn"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        width: "100%",
        padding: "12px",
        background: "rgba(42,31,25,0.04)",
        color: "var(--foreground)",
        border: "0.5px solid rgba(42,31,25,0.15)",
        borderRadius: 10,
        fontFamily: mono,
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: "-0.01em",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.15s ease",
      }}
    >
      <GoogleIcon />
      <span>Continue with <strong style={{ fontWeight: 600 }}>Google</strong></span>
    </button>
  );
}
