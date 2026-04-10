"use client";

import { useState } from "react";
import { X, Sparkles, FileText, Upload, Loader2, Archive, Folder, File as FileIcon } from "lucide-react";

type Tab = "ai" | "manual" | "import";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const mono  = "var(--mono), 'JetBrains Mono', monospace";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 12px",
  color: "var(--foreground)",
  fontFamily: mono,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontFamily: mono,
  fontSize: 11,
  fontWeight: 500,
  color: "var(--foreground-2)",
  marginBottom: 6,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.02em",
};

export function CreateSkillModal({ onClose, onCreated }: Props) {
  const [tab, setTab] = useState<Tab>("ai");
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI tab state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDraft, setAiDraft] = useState<{ name: string; description: string; instructions: string } | null>(null);

  // Manual tab state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");

  // Import tab state
  const [importDraft, setImportDraft] = useState<{ name: string; description: string; instructions: string } | null>(null);
  const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const [extractedFiles, setExtractedFiles] = useState<Array<{ path: string; blob: Blob; size: number }>>([]);
  const [importLoading, setImportLoading] = useState(false);

  const handleGenerate = async () => {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/skills/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Generation failed");
        return;
      }
      setAiDraft(data.skill);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (draft: { name: string; description: string; instructions: string }, source: string) => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save skill");
        return;
      }
      onCreated();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportFiles = async () => {
    if (!archiveFile) return;
    setError(null);
    setImportLoading(true);
    try {
      if (archiveFile.size > 20 * 1024 * 1024) {
        setError("Archive must be smaller than 20MB");
        return;
      }

      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(archiveFile);

      // Find SKILL.md at root (handle possible top-level folder wrapper)
      let skillMdEntry = zip.file("SKILL.md");
      let prefix = "";
      if (!skillMdEntry) {
        // Check if zip has a single root folder containing SKILL.md
        const topDirs = Object.keys(zip.files).filter(
          (n) => n.endsWith("/") && !n.slice(0, -1).includes("/"),
        );
        if (topDirs.length === 1) {
          skillMdEntry = zip.file(topDirs[0] + "SKILL.md");
          if (skillMdEntry) prefix = topDirs[0];
        }
      }
      if (!skillMdEntry) {
        setError("Archive must contain a SKILL.md file at the root");
        return;
      }

      // Extract all files, filtering junk
      const entries = Object.values(zip.files).filter(
        (f) =>
          !f.dir &&
          !f.name.startsWith("__MACOSX") &&
          !f.name.endsWith(".DS_Store") &&
          !f.name.includes("..") &&
          !f.name.startsWith("/"),
      );

      if (entries.length > 20) {
        setError("Archive contains too many files (maximum 20)");
        return;
      }

      const files: Array<{ path: string; blob: Blob; size: number }> = [];
      let totalSize = 0;
      for (const entry of entries) {
        const blob = await entry.async("blob");
        if (blob.size > 5 * 1024 * 1024) {
          setError(`File "${entry.name}" exceeds 5MB limit`);
          return;
        }
        totalSize += blob.size;
        if (totalSize > 25 * 1024 * 1024) {
          setError("Total extracted size exceeds 25MB");
          return;
        }
        // Strip the top-level folder prefix if present
        const path = prefix ? entry.name.slice(prefix.length) : entry.name;
        files.push({ path, blob, size: blob.size });
      }

      setExtractedFiles(files);

      // Send SKILL.md to existing parse endpoint
      const skillMdBlob = files.find((f) => f.path === "SKILL.md")!.blob;
      const formData = new FormData();
      formData.append("skillMd", skillMdBlob, "SKILL.md");

      const res = await fetch("/api/skills/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed");
        setImportDraft(null);
        return;
      }
      setImportDraft(data.skill);
    } catch {
      setError("Failed to read archive. Ensure it is a valid .zip file.");
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportSave = async () => {
    if (!importDraft || extractedFiles.length === 0) return;
    setError(null);
    setSubmitting(true);
    try {
      // 1. Create the skill record
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...importDraft, source: "import" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save skill");
        return;
      }
      // 2. Upload all extracted files in a single batch
      const fileForm = new FormData();
      const paths: string[] = [];
      for (const f of extractedFiles) {
        fileForm.append("files", f.blob, f.path.split("/").pop()!);
        paths.push(f.path);
      }
      fileForm.append("paths", JSON.stringify(paths));
      const uploadRes = await fetch(`/api/skills/${data.skill.id}/files`, {
        method: "POST",
        body: fileForm,
      });
      if (!uploadRes.ok) {
        const uploadData = await uploadRes.json();
        setError(uploadData.error || "File upload failed");
        return;
      }
      onCreated();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "ai", label: "AI Generate", icon: <Sparkles size={14} /> },
    { key: "manual", label: "Manual", icon: <FileText size={14} /> },
    { key: "import", label: "Import", icon: <Upload size={14} /> },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
      }}
    >
      <div
        style={{
          background: "#111111",
          border: "0.5px solid #1E1E1E",
          borderRadius: 16,
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          margin: "0 16px",
          padding: "1.5rem",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#F0EEE8", margin: 0 }}>
            Create Skill
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#0A0A0A", borderRadius: 10, padding: 4 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setError(null); }}
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
        {error && (
          <div style={{ background: "rgba(226,61,45,0.1)", border: "1px solid rgba(226,61,45,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#E23D2D" }}>
            {error}
          </div>
        )}

        {/* AI Generate Tab */}
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
                    width: "100%",
                    padding: "10px 0",
                    background: generating || aiPrompt.trim().length < 5 ? "#333" : "#FF4D00",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: generating || aiPrompt.trim().length < 5 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {generating ? (
                    <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Generating...</>
                  ) : (
                    <><Sparkles size={16} /> Generate with AI</>
                  )}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, color: "#555", marginBottom: 12, marginTop: 0 }}>
                  Review and edit the generated skill, then save.
                </p>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Name</label>
                  <input
                    value={aiDraft.name}
                    onChange={(e) => setAiDraft({ ...aiDraft, name: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Description</label>
                  <input
                    value={aiDraft.description}
                    onChange={(e) => setAiDraft({ ...aiDraft, description: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Instructions</label>
                  <textarea
                    value={aiDraft.instructions}
                    onChange={(e) => setAiDraft({ ...aiDraft, instructions: e.target.value })}
                    rows={5}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setAiDraft(null)}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      background: "#1E1E1E",
                      color: "#F0EEE8",
                      border: "none",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={() => handleSave(aiDraft, "ai")}
                    disabled={submitting}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      background: submitting ? "#333" : "#FF4D00",
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: submitting ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    {submitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
                    Save Skill
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Manual Tab */}
        {tab === "manual" && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Name (slug)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="e.g. sentiment-analysis"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="One sentence about what this skill does"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Instructions</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Detailed instructions for the agent on how to use this skill..."
                rows={5}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
            <button
              onClick={() => handleSave({ name, description, instructions }, "manual")}
              disabled={submitting || !name || !description || !instructions}
              style={{
                width: "100%",
                padding: "10px 0",
                background: submitting || !name || !description || !instructions ? "#333" : "#FF4D00",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: submitting || !name || !description || !instructions ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {submitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : null}
              Save Skill
            </button>
          </div>
        )}

        {/* Import Tab */}
        {tab === "import" && (
          <div>
            {!importDraft ? (
              <>
                <p style={{ fontSize: 13, color: "#888", marginTop: 0, marginBottom: 16, lineHeight: 1.5 }}>
                  Import a skill from a{" "}
                  <code style={{ background: "#1E1E1E", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>.zip</code> archive
                  containing a{" "}
                  <code style={{ background: "#1E1E1E", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>SKILL.md</code> file,
                  scripts, and any additional files the skill needs.
                </p>

                {/* Archive upload */}
                <label style={labelStyle}>Skill Archive (.zip)</label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "16px 14px",
                    border: archiveFile ? "1.5px solid rgba(255,77,0,0.4)" : "1.5px dashed #1E1E1E",
                    borderRadius: 10,
                    cursor: "pointer",
                    marginBottom: 16,
                    background: archiveFile ? "rgba(255,77,0,0.04)" : "transparent",
                  }}
                >
                  <Archive size={20} style={{ color: archiveFile ? "#FF4D00" : "#555", flexShrink: 0 }} />
                  <div style={{ overflow: "hidden" }}>
                    <span style={{ fontSize: 13, color: archiveFile ? "#F0EEE8" : "#888", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {archiveFile ? archiveFile.name : "Click to select a .zip archive"}
                    </span>
                    {archiveFile && (
                      <span style={{ fontSize: 11, color: "#555", marginTop: 2, display: "block" }}>
                        {(archiveFile.size / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".zip"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setArchiveFile(f); setImportDraft(null); setExtractedFiles([]); setError(null); }
                    }}
                  />
                </label>

                <button
                  onClick={handleImportFiles}
                  disabled={!archiveFile || importLoading}
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    background: !archiveFile || importLoading ? "#333" : "#FF4D00",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: !archiveFile || importLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {importLoading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Archive size={16} />}
                  {importLoading ? "Extracting..." : "Extract & Parse"}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, color: "#555", marginBottom: 12, marginTop: 0 }}>
                  Review the imported skill, then save.
                </p>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Name</label>
                  <input
                    value={importDraft.name}
                    onChange={(e) => setImportDraft({ ...importDraft, name: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Description</label>
                  <input
                    value={importDraft.description}
                    onChange={(e) => setImportDraft({ ...importDraft, description: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Instructions</label>
                  <textarea
                    value={importDraft.instructions}
                    onChange={(e) => setImportDraft({ ...importDraft, instructions: e.target.value })}
                    rows={5}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>

                {/* File tree */}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Files ({extractedFiles.length})</label>
                  <div style={{ background: "#0A0A0A", border: "0.5px solid #1E1E1E", borderRadius: 8, padding: "8px 0", maxHeight: 160, overflowY: "auto" }}>
                    {extractedFiles.map((f, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "5px 12px",
                          fontSize: 12,
                        }}
                      >
                        {f.path.includes("/") ? (
                          <Folder size={13} style={{ color: "#FF4D00", flexShrink: 0 }} />
                        ) : (
                          <FileIcon size={13} style={{ color: "#555", flexShrink: 0 }} />
                        )}
                        <span style={{ color: "#F0EEE8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                          {f.path}
                        </span>
                        <span style={{ color: "#555", flexShrink: 0 }}>
                          {f.size < 1024 ? `${f.size} B` : `${(f.size / 1024).toFixed(1)} KB`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { setImportDraft(null); setArchiveFile(null); setExtractedFiles([]); }}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      background: "#1E1E1E",
                      color: "#F0EEE8",
                      border: "none",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Choose Another
                  </button>
                  <button
                    onClick={handleImportSave}
                    disabled={submitting}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      background: submitting ? "#333" : "#FF4D00",
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: submitting ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    {submitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
                    Import Skill
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
