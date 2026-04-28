import { Loader2 } from "lucide-react";
import { ACCENT, mono } from "./constants";

type SubmitButtonProps = {
  loading: boolean;
  idleLabel: string;
  loadingLabel: string;
};

export function SubmitButton({ loading, idleLabel, loadingLabel }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        marginTop: "4px",
        background: loading ? "var(--surface-2)" : ACCENT,
        color: loading ? "var(--foreground-3)" : "#fff",
        border: "none",
        borderRadius: "10px",
        padding: "13px",
        fontFamily: mono,
        fontSize: "12px",
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: loading ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        width: "100%",
      }}
    >
      {loading ? (
        <>
          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
          {" "}{loadingLabel}
        </>
      ) : (
        `${idleLabel} →`
      )}
    </button>
  );
}
