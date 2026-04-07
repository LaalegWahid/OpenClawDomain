"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2, Trash2, Pencil } from "lucide-react";
import { CreateSkillModal } from "./create-skill-modal";
import { EditSkillModal } from "./edit-skill-modal";

interface SkillRecord {
  id: string;
  name: string;
  description: string;
  instructions: string;
  source: string;
  files: { key: string; filename: string; size: number; contentType: string }[];
  createdAt: string;
}

const skeleton: React.CSSProperties = {
  background: "linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%)",
  backgroundSize: "600px 100%",
  animation: "shimmer 1.4s infinite",
  borderRadius: 6,
};

const SOURCE_COLORS: Record<string, string> = {
  ai: "#9C27B0",
  manual: "#2196F3",
  import: "#4CAF50",
};

const SOURCE_LABELS: Record<string, string> = {
  ai: "AI Generated",
  manual: "Manual",
  import: "Imported",
};

export function SkillsContent() {
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillRecord | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/skills");
      if (res.ok) {
        const data = await res.json();
        setSkills(data.skills ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this skill? It will be unlinked from all agents.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/skills/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSkills((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#F0EEE8", margin: 0 }}>
            Your Skills
          </h1>
          <p style={{ fontSize: 14, color: "#555555", marginTop: 6 }}>
            Create and manage custom skills for your agents.
            {skills.length > 0 && ` ${skills.length} skill${skills.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            background: "#FF4D00",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Sparkles size={16} />
          Create Skill
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: "#111111", border: "0.5px solid #1E1E1E", borderRadius: 16, padding: "1.5rem" }}>
              <div style={{ ...skeleton, width: "60%", height: 14, marginBottom: 12 }} />
              <div style={{ ...skeleton, width: "100%", height: 10, marginBottom: 8 }} />
              <div style={{ ...skeleton, width: "80%", height: 10 }} />
            </div>
          ))}
        </div>
      ) : skills.length === 0 ? (
        <div
          style={{
            background: "#111111",
            border: "0.5px solid #1E1E1E",
            borderRadius: 16,
            padding: "3rem 2rem",
            textAlign: "center",
          }}
        >
          <Sparkles size={40} style={{ color: "#333", marginBottom: 12 }} />
          <p style={{ fontSize: 16, color: "#F0EEE8", fontWeight: 600, margin: "0 0 6px" }}>
            No skills yet
          </p>
          <p style={{ fontSize: 13, color: "#555555", margin: 0 }}>
            Create a skill using AI, write one manually, or import from a JSON file.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {skills.map((s) => (
            <div
              key={s.id}
              style={{
                background: "#111111",
                border: "0.5px solid #1E1E1E",
                borderRadius: 16,
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {/* Icon + source badge */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(255,77,0,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Sparkles size={18} style={{ color: "#FF4D00" }} />
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: `${SOURCE_COLORS[s.source] ?? "#555"}22`,
                    color: SOURCE_COLORS[s.source] ?? "#555",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {SOURCE_LABELS[s.source] ?? s.source}
                </span>
              </div>

              {/* Name */}
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#F0EEE8", margin: 0 }}>
                {s.name}
              </h3>

              {/* Description */}
              <p
                style={{
                  fontSize: 12,
                  color: "#888",
                  margin: 0,
                  lineHeight: 1.5,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {s.description}
              </p>

              {/* File count */}
              {(s.files?.length ?? 0) > 0 && (
                <p style={{ fontSize: 11, color: "#555", margin: 0 }}>
                  {s.files.length} file{s.files.length === 1 ? "" : "s"} attached
                </p>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                <button
                  onClick={() => setEditingSkill(s)}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "8px 0",
                    background: "#1E1E1E",
                    color: "#F0EEE8",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deleting === s.id}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "8px 0",
                    background: "rgba(226,61,45,0.1)",
                    color: "#E23D2D",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: deleting === s.id ? "not-allowed" : "pointer",
                    opacity: deleting === s.id ? 0.5 : 1,
                  }}
                >
                  {deleting === s.id ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={12} />}
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateSkillModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchSkills();
          }}
        />
      )}

      {/* Edit Modal */}
      {editingSkill && (
        <EditSkillModal
          skill={editingSkill}
          onClose={() => setEditingSkill(null)}
          onUpdated={() => {
            setEditingSkill(null);
            fetchSkills();
          }}
        />
      )}
    </div>
  );
}
