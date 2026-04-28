import { ACCENT, SUCCESS, mono } from "./constants";

export function SaveButton({ saved }: { saved: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
      <button type="submit" style={{
        background: ACCENT,
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "9px 22px",
        fontFamily: mono,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: "pointer",
      }}>
        Save
      </button>
      {saved && (
        <span style={{ fontFamily: mono, fontSize: 11, color: SUCCESS, letterSpacing: "0.04em" }}>Saved ✓</span>
      )}
    </div>
  );
}
