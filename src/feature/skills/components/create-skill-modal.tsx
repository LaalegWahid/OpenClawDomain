"use client";

import { useState } from "react";
import { X, Sparkles, FileText, Upload, Loader2 } from "lucide-react";

type Tab = "ai" | "manual" | "import";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

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
  const [skillMdFile, setSkillMdFile] = useState<File | null>(null);
  const [scriptFile, setScriptFile] = useState<File | null>(null);
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
    if (!skillMdFile) return;
    setError(null);
    setImportLoading(true);
    const formData = new FormData();
    formData.append("skillMd", skillMdFile);
    if (scriptFile) formData.append("script", scriptFile);
    try {
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
      setError("Network error. Please try again.");
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportSave = async () => {
    if (!importDraft) return;
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
      // 2. Upload the .py script to the skill's files if provided
      if (scriptFile) {
        const fileForm = new FormData();
        fileForm.append("files", scriptFile);
        await fetch(`/api/skills/${data.skill.id}/files`, {
          method: "POST",
          body: fileForm,
        });
      }
      // 3. Upload the SKILL.md to the skill's files
      if (skillMdFile) {
        const mdForm = new FormData();
        mdForm.append("files", skillMdFile);
        await fetch(`/api/skills/${data.skill.id}/files`, {
          method: "POST",
          body: mdForm,
        });
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
      onClick={onClose}
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
                  Import a skill using the ClawHub format: a{" "}
                  <code style={{ background: "#1E1E1E", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>SKILL.md</code> file
                  with frontmatter metadata, and an optional{" "}
                  <code style={{ background: "#1E1E1E", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>.py</code> script.
                </p>

                {/* SKILL.md upload */}
                <label style={labelStyle}>SKILL.md (required)</label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    border: skillMdFile ? "1.5px solid rgba(255,77,0,0.4)" : "1.5px dashed #1E1E1E",
                    borderRadius: 10,
                    cursor: "pointer",
                    marginBottom: 14,
                    background: skillMdFile ? "rgba(255,77,0,0.04)" : "transparent",
                  }}
                >
                  <FileText size={18} style={{ color: skillMdFile ? "#FF4D00" : "#555", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: skillMdFile ? "#F0EEE8" : "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {skillMdFile ? skillMdFile.name : "Click to select SKILL.md"}
                  </span>
                  <input
                    type="file"
                    accept=".md"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setSkillMdFile(f); setImportDraft(null); setError(null); }
                    }}
                  />
                </label>

                {/* Python script upload */}
                <label style={labelStyle}>Python Script (optional)</label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    border: scriptFile ? "1.5px solid rgba(76,175,80,0.4)" : "1.5px dashed #1E1E1E",
                    borderRadius: 10,
                    cursor: "pointer",
                    marginBottom: 16,
                    background: scriptFile ? "rgba(76,175,80,0.04)" : "transparent",
                  }}
                >
                  <Upload size={18} style={{ color: scriptFile ? "#4CAF50" : "#555", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: scriptFile ? "#F0EEE8" : "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {scriptFile ? scriptFile.name : "Click to select a .py file"}
                  </span>
                  <input
                    type="file"
                    accept=".py"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setScriptFile(f);
                    }}
                  />
                </label>

                <button
                  onClick={handleImportFiles}
                  disabled={!skillMdFile || importLoading}
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    background: !skillMdFile || importLoading ? "#333" : "#FF4D00",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: !skillMdFile || importLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {importLoading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={16} />}
                  {importLoading ? "Parsing..." : "Parse Skill"}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, color: "#555", marginBottom: 12, marginTop: 0 }}>
                  Review the imported skill, then save.{scriptFile && <span style={{ color: "#4CAF50" }}> Script: {scriptFile.name}</span>}
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
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Instructions</label>
                  <textarea
                    value={importDraft.instructions}
                    onChange={(e) => setImportDraft({ ...importDraft, instructions: e.target.value })}
                    rows={5}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { setImportDraft(null); setSkillMdFile(null); setScriptFile(null); }}
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
