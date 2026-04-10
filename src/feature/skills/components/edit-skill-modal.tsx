"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Upload, Download } from "lucide-react";

const mono  = "var(--mono), 'JetBrains Mono', monospace";
const serif = "var(--serif), 'Cormorant Garamond', Georgia, serif";

interface SkillFile { key: string; filename: string; size: number; contentType: string; url?: string; }
interface SkillRecord { id: string; name: string; description: string; instructions: string; source: string; files: SkillFile[]; }
interface Props { skill: SkillRecord; onClose: () => void; onUpdated: () => void; }

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--surface-2)",
  border: "1px solid var(--border)", borderRadius: 8,
  padding: "10px 12px", color: "var(--foreground)",
  fontFamily: mono, fontSize: 13, outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, fontWeight: 500,
  color: "var(--foreground-2)", marginBottom: 6, display: "block",
  textTransform: "uppercase", letterSpacing: "0.08em",
};

export function EditSkillModal({ skill: initialSkill, onClose, onUpdated }: Props) {
  const [name, setName] = useState(initialSkill.name);
  const [description, setDescription] = useState(initialSkill.description);
  const [instructions, setInstructions] = useState(initialSkill.instructions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<SkillFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchFiles = async () => {
      setLoadingFiles(true);
      try {
        const res = await fetch(`/api/skills/${initialSkill.id}/files`);
        if (res.ok) { const data = await res.json(); setFiles(data.files ?? []); }
      } catch { /* silent */ } finally { setLoadingFiles(false); }
    };
    fetchFiles();
  }, [initialSkill.id]);

  const handleSave = async () => {
    setError(null); setSaving(true);
    try {
      const res = await fetch(`/api/skills/${initialSkill.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, instructions }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to update"); return; }
      onUpdated();
    } catch { setError("Network error. Please try again."); } finally { setSaving(false); }
  };

  const handleUploadFiles = async (fileList: FileList) => {
    setUploading(true); setError(null);
    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) formData.append("files", fileList[i]);
    try {
      const res = await fetch(`/api/skills/${initialSkill.id}/files`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Upload failed"); return; }
      const fetchRes = await fetch(`/api/skills/${initialSkill.id}/files`);
      if (fetchRes.ok) { const d = await fetchRes.json(); setFiles(d.files ?? []); }
    } catch { setError("Upload failed. Please try again."); } finally { setUploading(false); }
  };

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(42,31,25,0.4)", backdropFilter: "blur(2px)" }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", margin: "0 16px", padding: "1.5rem", boxShadow: "0 8px 40px rgba(42,31,25,0.12)" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>Edit Skill</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--foreground-3)", cursor: "pointer", padding: 4 }}><X size={18} /></button>
        </div>

        {error && <div style={{ background: "rgba(226,61,45,0.08)", border: "1px solid rgba(226,61,45,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontFamily: mono, fontSize: 12, color: "#E23D2D" }}>{error}</div>}

        <div style={{ marginBottom: 12 }}><label style={labelStyle}>Name</label><input value={name} onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} style={inputStyle} /></div>
        <div style={{ marginBottom: 12 }}><label style={labelStyle}>Description</label><input value={description} onChange={e => setDescription(e.target.value)} style={inputStyle} /></div>
        <div style={{ marginBottom: 20 }}><label style={labelStyle}>Instructions</label><textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={5} style={{ ...inputStyle, resize: "vertical" }} /></div>

        {/* Files */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Files</label>
          {loadingFiles ? (
            <p style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-3)" }}>Loading files…</p>
          ) : files.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {files.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ overflow: "hidden" }}>
                    <p style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground)", margin: 0, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{f.filename}</p>
                    <p style={{ fontFamily: mono, fontSize: 10, color: "var(--foreground-3)", margin: 0 }}>{formatSize(f.size)}</p>
                  </div>
                  {f.url && <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ color: "#FF4D00", padding: 4 }}><Download size={14} /></a>}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-3)", margin: "0 0 12px" }}>No files attached.</p>
          )}
          {files.length < 5 && (
            <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", border: "1.5px dashed var(--border-2)", borderRadius: 8, cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.5 : 1 }}>
              {uploading
                ? <><Loader2 size={14} style={{ color: "var(--foreground-3)", animation: "spin 1s linear infinite" }} /><span style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-3)" }}>Uploading…</span></>
                : <><Upload size={14} style={{ color: "var(--foreground-3)" }} /><span style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-3)" }}>Upload files (max 5MB each)</span></>}
              <input type="file" multiple style={{ display: "none" }} disabled={uploading} onChange={e => { if (e.target.files?.length) handleUploadFiles(e.target.files); }} />
            </label>
          )}
        </div>

        <button onClick={handleSave} disabled={saving || !name || !description || !instructions} style={{ width: "100%", padding: "10px 0", background: saving || !name || !description || !instructions ? "var(--surface-2)" : "#FF4D00", color: saving || !name || !description || !instructions ? "var(--foreground-3)" : "#fff", border: "none", borderRadius: 10, fontFamily: mono, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", cursor: saving || !name || !description || !instructions ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null} Save Changes
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
