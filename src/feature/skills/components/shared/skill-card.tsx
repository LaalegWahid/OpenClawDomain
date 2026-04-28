import { Loader2, Pencil, Sparkles, Trash2 } from "lucide-react";
import { ACCENT, SOURCE_COLORS, SOURCE_LABELS } from "./constants";
import type { SkillRecord } from "./types";

type Props = {
  skill: SkillRecord;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function SkillCard({ skill, deleting, onEdit, onDelete }: Props) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: "1.5rem", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,77,0,0.08)", border: "1px solid rgba(255,77,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={18} style={{ color: ACCENT }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: `${SOURCE_COLORS[skill.source] ?? "#555"}22`, color: SOURCE_COLORS[skill.source] ?? "#555", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {SOURCE_LABELS[skill.source] ?? skill.source}
        </span>
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{skill.name}</h3>
      <p style={{ fontSize: 12, color: "var(--foreground-2)", margin: 0, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {skill.description}
      </p>
      {(skill.files?.length ?? 0) > 0 && (
        <p style={{ fontSize: 11, color: "var(--foreground-3)", margin: 0 }}>
          {skill.files.length} file{skill.files.length === 1 ? "" : "s"} attached
        </p>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <button
          onClick={onEdit}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", background: "var(--surface)", color: "var(--foreground)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
        >
          <Pencil size={12} /> Edit
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", background: "rgba(226,61,45,0.05)", color: "#E23D2D", border: "1px solid rgba(226,61,45,0.2)", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.5 : 1 }}
        >
          {deleting ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={12} />} Delete
        </button>
      </div>
    </div>
  );
}
