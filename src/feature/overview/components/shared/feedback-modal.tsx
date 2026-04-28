"use client";

import { useState } from "react";
import { Loader2, Sparkles, Star, X } from "lucide-react";
import { ACCENT, inputStyle, labelStyle, serif } from "./constants";
import { submitAgentFeedback } from "../../actions/agent.actions";

type Props = {
  agentId: string;
  onClose: () => void;
};

export function FeedbackModal({ agentId, onClose }: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!rating || submitting) return;
    setSubmitting(true);
    try {
      await submitAgentFeedback({ rating, comment, agentId });
      setDone(true);
      setTimeout(onClose, 1200);
    } catch {
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(28,22,18,0.4)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: "1.75rem", width: "100%", maxWidth: 440, margin: "1rem", boxShadow: "0 8px 40px rgba(28,22,18,0.12)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px", borderRadius: 999, background: "rgba(76,175,80,0.12)", color: "#2f8a33", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10 }}>
              <Sparkles size={11} /> Agent created
            </div>
            <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, margin: 0, color: "var(--foreground)" }}>
              How was your experience?
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--foreground-2)" }}>
              Your feedback helps us refine the flow for everyone.
            </p>
          </div>
          {!submitting && (
            <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--foreground-2)" }}>
              <X size={18} />
            </button>
          )}
        </div>

        {done ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: "#2f8a33", fontSize: 14, fontWeight: 500 }}>
            Thanks for your feedback!
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "14px 0 18px" }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (hover || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 0, transition: "transform 0.12s" }}
                  >
                    <Star size={32} fill={active ? "#FFB400" : "transparent"} stroke={active ? "#FFB400" : "var(--foreground-2)"} strokeWidth={1.5} />
                  </button>
                );
              })}
            </div>

            <label style={{ ...labelStyle, marginBottom: 6 }}>Optional comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Anything that felt great or frustrating?"
              rows={3}
              maxLength={2000}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--foreground-2)", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: submitting ? "not-allowed" : "pointer" }}
              >
                Skip
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!rating || submitting}
                style={{
                  background: rating ? ACCENT : "rgba(255,77,0,0.4)",
                  color: "#fff", border: "none", borderRadius: 8,
                  padding: "9px 18px", fontSize: 13, fontWeight: 600,
                  cursor: !rating || submitting ? "not-allowed" : "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                {submitting && <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} />}
                Submit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
