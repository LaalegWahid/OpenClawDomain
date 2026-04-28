"use client";

import { useState, useEffect } from "react";
import { Loader2, Upload } from "lucide-react";
import {
  ACCENT,
  ErrorBanner,
  ModalShell,
  inputStyle,
  labelStyle,
  type SkillFile,
  type SkillRecord,
} from "./shared";
import { fetchSkillFiles, updateSkill, uploadSkillFiles } from "../actions/skill.actions";

interface Props {
  skill: SkillRecord;
  onClose: () => void;
  onUpdated: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
    setLoadingFiles(true);
    fetchSkillFiles(initialSkill.id)
      .then(setFiles)
      .finally(() => setLoadingFiles(false));
  }, [initialSkill.id]);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const { ok, error: err } = await updateSkill(initialSkill.id, { name, description, instructions });
      if (!ok) { setError(err || "Failed to update"); return; }
      onUpdated();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadFiles = async (fileList: FileList) => {
    setUploading(true); setError(null);
    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) formData.append("files", fileList[i]);
    try {
      const upload = await uploadSkillFiles(initialSkill.id, formData);
      if (!upload.ok) { setError(upload.error || "Upload failed"); return; }
      setFiles(await fetchSkillFiles(initialSkill.id));
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const saveDisabled = saving || !name || !description || !instructions;

  return (
    <ModalShell title="Edit Skill" onClose={onClose} maxWidth={520}>
      {error && <ErrorBanner message={error} />}

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Instructions</label>
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={5} style={{ ...inputStyle, resize: "vertical" }} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Files</label>
        {loadingFiles ? (
          <p style={{ fontSize: 12, color: "var(--foreground-3)" }}>Loading files…</p>
        ) : files.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {files.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ overflow: "hidden" }}>
                  <p style={{ fontSize: 12, color: "var(--foreground)", margin: 0, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{f.filename}</p>
                  <p style={{ fontSize: 10, color: "var(--foreground-3)", margin: 0 }}>{formatSize(f.size)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "var(--foreground-3)", margin: "0 0 12px" }}>No files attached.</p>
        )}
        {files.length < 5 && (
          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 10, border: "1.5px dashed var(--border-2)", borderRadius: 8, cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.5 : 1 }}>
            {uploading ? (
              <>
                <Loader2 size={14} style={{ color: "var(--foreground-3)", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 12, color: "var(--foreground-3)" }}>Uploading…</span>
              </>
            ) : (
              <>
                <Upload size={14} style={{ color: "var(--foreground-3)" }} />
                <span style={{ fontSize: 12, color: "var(--foreground-3)" }}>Upload files (max 5MB each)</span>
              </>
            )}
            <input
              type="file"
              multiple
              style={{ display: "none" }}
              disabled={uploading}
              onChange={(e) => { if (e.target.files?.length) handleUploadFiles(e.target.files); }}
            />
          </label>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saveDisabled}
        style={{
          width: "100%", padding: "10px 0",
          background: saveDisabled ? "var(--surface-2)" : ACCENT,
          color: saveDisabled ? "var(--foreground-3)" : "#fff",
          border: "none", borderRadius: 10,
          fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
          cursor: saveDisabled ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null} Save Changes
      </button>
    </ModalShell>
  );
}
