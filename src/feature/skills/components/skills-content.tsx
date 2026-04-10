"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2, Trash2, Pencil, FileText, Upload, Archive, Folder, File as FileIcon } from "lucide-react";
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

type Tab = "ai" | "manual" | "import";

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

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0A0A0A",
  border: "0.5px solid #1E1E1E",
  borderRadius: 8,
  padding: "10px 12px",
  color: "#F0EEE8",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "#555555",
  marginBottom: 6,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.02em",
};

export function SkillsContent() {
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSkill, setEditingSkill] = useState<SkillRecord | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Create skill state
  const [tab, setTab] = useState<Tab>("ai");
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDraft, setAiDraft] = useState<{ name: string; description: string; instructions: string } | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");

  const [importDraft, setImportDraft] = useState<{ name: string; description: string; instructions: string } | null>(null);
  const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const [extractedFiles, setExtractedFiles] = useState<Array<{ path: string; blob: Blob; size: number }>>([]);
  const [importLoading, setImportLoading] = useState(false);

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
      if (res.ok) setSkills((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  };

  const handleGenerate = async () => {
    setCreateError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/skills/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || "Generation failed"); return; }
      setAiDraft(data.skill);
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (draft: { name: string; description: string; instructions: string }, source: string) => {
    setCreateError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, source }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || "Failed to save skill"); return; }
      setAiPrompt(""); setAiDraft(null); setName(""); setDescription(""); setInstructions("");
      fetchSkills();
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportFiles = async () => {
    if (!archiveFile) return;
    setCreateError(null);
    setImportLoading(true);
    try {
      if (archiveFile.size > 20 * 1024 * 1024) { setCreateError("Archive must be smaller than 20MB"); return; }
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(archiveFile);
      let skillMdEntry = zip.file("SKILL.md");
      let prefix = "";
      if (!skillMdEntry) {
        const topDirs = Object.keys(zip.files).filter((n) => n.endsWith("/") && !n.slice(0, -1).includes("/"));
        if (topDirs.length === 1) { skillMdEntry = zip.file(topDirs[0] + "SKILL.md"); if (skillMdEntry) prefix = topDirs[0]; }
      }
      if (!skillMdEntry) { setCreateError("Archive must contain a SKILL.md file at the root"); return; }
      const entries = Object.values(zip.files).filter(
        (f) => !f.dir && !f.name.startsWith("__MACOSX") && !f.name.endsWith(".DS_Store") && !f.name.includes("..") && !f.name.startsWith("/"),
      );
      if (entries.length > 20) { setCreateError("Archive contains too many files (maximum 20)"); return; }
      const files: Array<{ path: string; blob: Blob; size: number }> = [];
      let totalSize = 0;
      for (const entry of entries) {
        const blob = await entry.async("blob");
        if (blob.size > 5 * 1024 * 1024) { setCreateError(`File "${entry.name}" exceeds 5MB limit`); return; }
        totalSize += blob.size;
        if (totalSize > 25 * 1024 * 1024) { setCreateError("Total extracted size exceeds 25MB"); return; }
        const path = prefix ? entry.name.slice(prefix.length) : entry.name;
        files.push({ path, blob, size: blob.size });
      }
      setExtractedFiles(files);
      const skillMdBlob = files.find((f) => f.path === "SKILL.md")!.blob;
      const formData = new FormData();
      formData.append("skillMd", skillMdBlob, "SKILL.md");
      const res = await fetch("/api/skills/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || "Import failed"); setImportDraft(null); return; }
      setImportDraft(data.skill);
    } catch {
      setCreateError("Failed to read archive. Ensure it is a valid .zip file.");
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportSave = async () => {
    if (!importDraft || extractedFiles.length === 0) return;
    setCreateError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...importDraft, source: "import" }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || "Failed to save skill"); return; }
      const fileForm = new FormData();
      const paths: string[] = [];
      for (const f of extractedFiles) { fileForm.append("files", f.blob, f.path.split("/").pop()!); paths.push(f.path); }
      fileForm.append("paths", JSON.stringify(paths));
      const uploadRes = await fetch(`/api/skills/${data.skill.id}/files`, { method: "POST", body: fileForm });
      if (!uploadRes.ok) { const d = await uploadRes.json(); setCreateError(d.error || "File upload failed"); return; }
      setImportDraft(null); setArchiveFile(null); setExtractedFiles([]);
      fetchSkills();
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const createTabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "ai", label: "AI Generate", icon: <Sparkles size={14} /> },
    { key: "manual", label: "Manual", icon: <FileText size={14} /> },
    { key: "import", label: "Import", icon: <Upload size={14} /> },
  ];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>

      {/* ── Create Skill ── */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#F0EEE8", margin: "0 0 6px" }}>Create Skill</h1>
          <p style={{ fontSize: 14, color: "#555555", margin: 0 }}>
            Build a new skill using AI, write one manually, or import from a zip archive.
          </p>
        </div>

        <div
          style={{
            background: "#111111",
            border: "0.5px solid #1E1E1E",
            borderRadius: 16,
            padding: "1.5rem",
            maxWidth: 560,
          }}
        >
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#0A0A0A", borderRadius: 10, padding: 4 }}>
            {createTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setCreateError(null); }}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "8px 0",
                  background: tab === t.key ? "#1E1E1E" : "transparent",
                  color: tab === t.key ? "#F0EEE8" : "#555",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Error */}
          {createError && (
            <div style={{ background: "rgba(226,61,45,0.1)", border: "1px solid rgba(226,61,45,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#E23D2D" }}>
              {createError}
            </div>
          )}

          {/* AI Generate */}
          {tab === "ai" && (
            <div>
              {!aiDraft ? (
                <>
                  <label style={labelStyle}>Describe the skill you want</label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. A skill that helps the agent analyze customer feedback and extract sentiment patterns..."
                    rows={4}
                    style={{ ...inputStyle, resize: "vertical", marginBottom: 16 }}
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={generating || aiPrompt.trim().length < 5}
                    style={{
                      width: "100%", padding: "10px 0",
                      background: generating || aiPrompt.trim().length < 5 ? "#333" : "#FF4D00",
                      color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600,
                      cursor: generating || aiPrompt.trim().length < 5 ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    {generating ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Generating...</> : <><Sparkles size={16} /> Generate with AI</>}
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: "#555", marginBottom: 12, marginTop: 0 }}>Review and edit the generated skill, then save.</p>
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Name</label>
                    <input value={aiDraft.name} onChange={(e) => setAiDraft({ ...aiDraft, name: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Description</label>
                    <input value={aiDraft.description} onChange={(e) => setAiDraft({ ...aiDraft, description: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Instructions</label>
                    <textarea value={aiDraft.instructions} onChange={(e) => setAiDraft({ ...aiDraft, instructions: e.target.value })} rows={5} style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setAiDraft(null)} style={{ flex: 1, padding: "10px 0", background: "#1E1E1E", color: "#F0EEE8", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      Regenerate
                    </button>
                    <button onClick={() => handleSave(aiDraft, "ai")} disabled={submitting} style={{ flex: 1, padding: "10px 0", background: submitting ? "#333" : "#FF4D00", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      {submitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null} Save Skill
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Manual */}
          {tab === "manual" && (
            <div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Name (slug)</label>
                <input value={name} onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} placeholder="e.g. sentiment-analysis" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Description</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="One sentence about what this skill does" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Instructions</label>
                <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Detailed instructions for the agent on how to use this skill..." rows={5} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <button
                onClick={() => handleSave({ name, description, instructions }, "manual")}
                disabled={submitting || !name || !description || !instructions}
                style={{ width: "100%", padding: "10px 0", background: submitting || !name || !description || !instructions ? "#333" : "#FF4D00", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: submitting || !name || !description || !instructions ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {submitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : null} Save Skill
              </button>
            </div>
          )}

          {/* Import */}
          {tab === "import" && (
            <div>
              {!importDraft ? (
                <>
                  <p style={{ fontSize: 13, color: "#888", marginTop: 0, marginBottom: 16, lineHeight: 1.5 }}>
                    Import a skill from a <code style={{ background: "#1E1E1E", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>.zip</code> archive containing a <code style={{ background: "#1E1E1E", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>SKILL.md</code> file, scripts, and any additional files the skill needs.
                  </p>
                  <label style={labelStyle}>Skill Archive (.zip)</label>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 14px", border: archiveFile ? "1.5px solid rgba(255,77,0,0.4)" : "1.5px dashed #1E1E1E", borderRadius: 10, cursor: "pointer", marginBottom: 16, background: archiveFile ? "rgba(255,77,0,0.04)" : "transparent" }}>
                    <Archive size={20} style={{ color: archiveFile ? "#FF4D00" : "#555", flexShrink: 0 }} />
                    <div style={{ overflow: "hidden" }}>
                      <span style={{ fontSize: 13, color: archiveFile ? "#F0EEE8" : "#888", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {archiveFile ? archiveFile.name : "Click to select a .zip archive"}
                      </span>
                      {archiveFile && <span style={{ fontSize: 11, color: "#555", marginTop: 2, display: "block" }}>{(archiveFile.size / 1024).toFixed(1)} KB</span>}
                    </div>
                    <input type="file" accept=".zip" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { setArchiveFile(f); setImportDraft(null); setExtractedFiles([]); setCreateError(null); } }} />
                  </label>
                  <button onClick={handleImportFiles} disabled={!archiveFile || importLoading} style={{ width: "100%", padding: "10px 0", background: !archiveFile || importLoading ? "#333" : "#FF4D00", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: !archiveFile || importLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {importLoading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Archive size={16} />}
                    {importLoading ? "Extracting..." : "Extract & Parse"}
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: "#555", marginBottom: 12, marginTop: 0 }}>Review the imported skill, then save.</p>
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Name</label>
                    <input value={importDraft.name} onChange={(e) => setImportDraft({ ...importDraft, name: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Description</label>
                    <input value={importDraft.description} onChange={(e) => setImportDraft({ ...importDraft, description: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Instructions</label>
                    <textarea value={importDraft.instructions} onChange={(e) => setImportDraft({ ...importDraft, instructions: e.target.value })} rows={5} style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Files ({extractedFiles.length})</label>
                    <div style={{ background: "#0A0A0A", border: "0.5px solid #1E1E1E", borderRadius: 8, padding: "8px 0", maxHeight: 160, overflowY: "auto" }}>
                      {extractedFiles.map((f, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", fontSize: 12 }}>
                          {f.path.includes("/") ? <Folder size={13} style={{ color: "#FF4D00", flexShrink: 0 }} /> : <FileIcon size={13} style={{ color: "#555", flexShrink: 0 }} />}
                          <span style={{ color: "#F0EEE8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{f.path}</span>
                          <span style={{ color: "#555", flexShrink: 0 }}>{f.size < 1024 ? `${f.size} B` : `${(f.size / 1024).toFixed(1)} KB`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setImportDraft(null); setArchiveFile(null); setExtractedFiles([]); }} style={{ flex: 1, padding: "10px 0", background: "#1E1E1E", color: "#F0EEE8", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      Choose Another
                    </button>
                    <button onClick={handleImportSave} disabled={submitting} style={{ flex: 1, padding: "10px 0", background: submitting ? "#333" : "#FF4D00", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      {submitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null} Import Skill
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Your Skills ── */}
      <div>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#F0EEE8", margin: "0 0 6px" }}>
            Your Skills
          </h2>
          <p style={{ fontSize: 14, color: "#555555", margin: 0 }}>
            {skills.length > 0 ? `${skills.length} skill${skills.length === 1 ? "" : "s"} created` : "No skills yet."}
          </p>
        </div>

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
          <div style={{ background: "#111111", border: "0.5px solid #1E1E1E", borderRadius: 16, padding: "3rem 2rem", textAlign: "center" }}>
            <Sparkles size={40} style={{ color: "#333", marginBottom: 12 }} />
            <p style={{ fontSize: 16, color: "#F0EEE8", fontWeight: 600, margin: "0 0 6px" }}>No skills yet</p>
            <p style={{ fontSize: 13, color: "#555555", margin: 0 }}>Create a skill above to get started.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {skills.map((s) => (
              <div key={s.id} style={{ background: "#111111", border: "0.5px solid #1E1E1E", borderRadius: 16, padding: "1.5rem", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,77,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Sparkles size={18} style={{ color: "#FF4D00" }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: `${SOURCE_COLORS[s.source] ?? "#555"}22`, color: SOURCE_COLORS[s.source] ?? "#555", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {SOURCE_LABELS[s.source] ?? s.source}
                  </span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "#F0EEE8", margin: 0 }}>{s.name}</h3>
                <p style={{ fontSize: 12, color: "#888", margin: 0, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {s.description}
                </p>
                {(s.files?.length ?? 0) > 0 && (
                  <p style={{ fontSize: 11, color: "#555", margin: 0 }}>{s.files.length} file{s.files.length === 1 ? "" : "s"} attached</p>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  <button onClick={() => setEditingSkill(s)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", background: "#1E1E1E", color: "#F0EEE8", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => handleDelete(s.id)} disabled={deleting === s.id} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", background: "rgba(226,61,45,0.1)", color: "#E23D2D", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: deleting === s.id ? "not-allowed" : "pointer", opacity: deleting === s.id ? 0.5 : 1 }}>
                    {deleting === s.id ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={12} />} Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingSkill && (
        <EditSkillModal
          skill={editingSkill}
          onClose={() => setEditingSkill(null)}
          onUpdated={() => { setEditingSkill(null); fetchSkills(); }}
        />
      )}
    </div>
  );
}