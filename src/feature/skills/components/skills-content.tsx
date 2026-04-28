"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2, Upload, Archive, Folder, File as FileIcon, KeyRound } from "lucide-react";
import { EditSkillModal } from "./edit-skill-modal";
import {
  ACCENT,
  ErrorBanner,
  ModalShell,
  SUPPORTED_PROVIDERS,
  SkillCard,
  SkillCardSkeleton,
  SkillsStyles,
  inputStyle,
  labelStyle,
  type AiDraft,
  type ExtractedFile,
  type ImportDraft,
  type SkillKeyInfo,
  type SkillRecord,
} from "./shared";
import {
  buildAiSkillFormData,
  buildExtractedFilesFormData,
  createSkillRecord,
  deleteSkill,
  extractSkillArchive,
  fetchModelsCatalog,
  fetchSkillKeyInfo,
  fetchSkills,
  generateAiSkill,
  importSkillFromMd,
  saveSkillKey,
  uploadSkillFiles,
} from "../actions/skill.actions";

type Tab = "ai" | "import";

export function SkillsContent() {
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSkill, setEditingSkill] = useState<SkillRecord | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);

  const [tab, setTab] = useState<Tab>("ai");
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);

  const [keyInfo, setKeyInfo] = useState<SkillKeyInfo | null>(null);
  const [keyInfoLoading, setKeyInfoLoading] = useState(true);
  const [showKeyEditor, setShowKeyEditor] = useState(false);
  const [modelsCatalog, setModelsCatalog] = useState<Record<string, string[]>>({});
  const [setupProvider, setSetupProvider] = useState("");
  const [setupModel, setSetupModel] = useState("");
  const [setupApiKey, setSetupApiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const [importDraft, setImportDraft] = useState<ImportDraft | null>(null);
  const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFile[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  const refreshKeyInfo = useCallback(async () => {
    setKeyInfoLoading(true);
    setKeyInfo(await fetchSkillKeyInfo());
    setKeyInfoLoading(false);
  }, []);

  useEffect(() => {
    refreshKeyInfo();
    fetchModelsCatalog().then(setModelsCatalog);
  }, [refreshKeyInfo]);

  // When opening modal on AI tab without a saved key, default to the editor
  useEffect(() => {
    if (!showModal || tab !== "ai" || keyInfoLoading) return;
    if (!keyInfo?.hasKey) {
      setSetupProvider("");
      setSetupModel("");
      setSetupApiKey("");
      setKeyError(null);
      setShowKeyEditor(true);
    }
  }, [showModal, tab, keyInfo, keyInfoLoading]);

  const providerNames = Object.keys(modelsCatalog).filter(
    (p) => (SUPPORTED_PROVIDERS as readonly string[]).includes(p),
  );
  const setupAvailableModels = setupProvider ? (modelsCatalog[setupProvider] ?? []) : [];

  const refreshSkills = useCallback(async () => {
    setLoading(true);
    setSkills(await fetchSkills());
    setLoading(false);
  }, []);

  useEffect(() => { refreshSkills(); }, [refreshSkills]);

  const handleSaveApiKey = async () => {
    setKeyError(null);
    if (!setupProvider) { setKeyError("Select a provider."); return; }
    if (!setupModel) { setKeyError("Select a model."); return; }
    if (!setupApiKey.trim()) { setKeyError("Enter your API key."); return; }
    setSavingKey(true);
    try {
      const { ok, error } = await saveSkillKey({
        provider: setupProvider,
        model: setupModel,
        apiKey: setupApiKey.trim(),
      });
      if (!ok) { setKeyError(error || "Failed to save API key."); return; }
      setKeyInfo({ hasKey: true, provider: setupProvider, model: setupModel });
      setSetupApiKey("");
      setShowKeyEditor(false);
    } catch {
      setKeyError("Network error. Please try again.");
    } finally {
      setSavingKey(false);
    }
  };

  const openKeyEditor = () => {
    setSetupProvider(keyInfo?.provider ?? "");
    setSetupModel(keyInfo?.model ?? "");
    setSetupApiKey("");
    setKeyError(null);
    setShowKeyEditor(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this skill? It will be unlinked from all agents.")) return;
    setDeleting(id);
    try {
      if (await deleteSkill(id)) {
        setSkills((prev) => prev.filter((s) => s.id !== id));
      }
    } finally {
      setDeleting(null);
    }
  };

  const handleGenerate = async () => {
    setCreateError(null);
    setGenerating(true);
    try {
      const { ok, data } = await generateAiSkill(aiPrompt);
      if (!ok) {
        if (data.error === "missing_skill_api_key") {
          setKeyInfo({ hasKey: false });
          setShowKeyEditor(true);
          setCreateError(data.message || "Save your AI provider API key to generate skills.");
          return;
        }
        setCreateError(data.error || "Generation failed");
        return;
      }
      setAiDraft({ ...data.skill, files: Array.isArray(data.skill?.files) ? data.skill.files : [] });
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAi = async (draft: AiDraft) => {
    setCreateError(null);
    setSubmitting(true);
    try {
      const { ok, data } = await createSkillRecord({
        name: draft.name,
        description: draft.description,
        instructions: draft.instructions,
        source: "ai",
      });
      if (!ok) { setCreateError(data.error || "Failed to save skill"); return; }

      const upload = await uploadSkillFiles(data.skill.id, buildAiSkillFormData(draft));
      if (!upload.ok) { setCreateError(upload.error || "File upload failed"); return; }

      setAiPrompt(""); setAiDraft(null);
      setShowModal(false);
      refreshSkills();
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
      const files = await extractSkillArchive(archiveFile);
      setExtractedFiles(files);
      const skillMdBlob = files.find((f) => f.path === "SKILL.md")!.blob;
      const { ok, data } = await importSkillFromMd(skillMdBlob);
      if (!ok) { setCreateError(data.error || "Import failed"); setImportDraft(null); return; }
      setImportDraft(data.skill);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to read archive. Ensure it is a valid .zip file.");
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportSave = async () => {
    if (!importDraft || extractedFiles.length === 0) return;
    setCreateError(null);
    setSubmitting(true);
    try {
      const { ok, data } = await createSkillRecord({ ...importDraft, source: "import" });
      if (!ok) { setCreateError(data.error || "Failed to save skill"); return; }
      const upload = await uploadSkillFiles(data.skill.id, buildExtractedFilesFormData(extractedFiles));
      if (!upload.ok) { setCreateError(upload.error || "File upload failed"); return; }
      setImportDraft(null); setArchiveFile(null); setExtractedFiles([]);
      setShowModal(false);
      refreshSkills();
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const createTabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "ai", label: "AI Generate", icon: <Sparkles size={14} /> },
    { key: "import", label: "Import", icon: <Upload size={14} /> },
  ];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", color: "var(--foreground)", letterSpacing: "-0.01em" }}>Skills</h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--foreground-3)" }}>
            {skills.length > 0 ? `${skills.length} skill${skills.length === 1 ? "" : "s"} created` : "No skills yet."}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: ACCENT, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }}
        >
          <Sparkles size={14} /> New Skill
        </button>
      </div>

      {/* Create Skill Modal */}
      {showModal && (
        <ModalShell
          title="Create Skill"
          subtitle="Generate a new skill with AI or import one from a zip archive."
          onClose={() => setShowModal(false)}
        >
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--surface-2)", borderRadius: 10, padding: 4 }}>
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
                  background: tab === t.key ? "var(--surface)" : "transparent",
                  color: tab === t.key ? "var(--foreground)" : "var(--foreground-3)",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {createError && <ErrorBanner message={createError} />}

          {tab === "ai" && (
            <div>
              {keyInfoLoading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 0", color: "var(--foreground-3)" }}>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite", marginRight: 8 }} /> Checking saved API key…
                </div>
              ) : showKeyEditor || !keyInfo?.hasKey ? (
                <KeyEditor
                  hasKey={!!keyInfo?.hasKey}
                  setupProvider={setupProvider}
                  setSetupProvider={(v) => { setSetupProvider(v); setSetupModel(""); }}
                  setupModel={setupModel}
                  setSetupModel={setSetupModel}
                  setupApiKey={setupApiKey}
                  setSetupApiKey={setSetupApiKey}
                  providerNames={providerNames}
                  setupAvailableModels={setupAvailableModels}
                  keyError={keyError}
                  savingKey={savingKey}
                  onCancel={() => { setShowKeyEditor(false); setKeyError(null); }}
                  onSave={handleSaveApiKey}
                />
              ) : !aiDraft ? (
                <AiPromptForm
                  keyInfo={keyInfo}
                  aiPrompt={aiPrompt}
                  setAiPrompt={setAiPrompt}
                  generating={generating}
                  onGenerate={handleGenerate}
                  onChangeKey={openKeyEditor}
                />
              ) : (
                <AiDraftForm
                  aiDraft={aiDraft}
                  setAiDraft={setAiDraft}
                  submitting={submitting}
                  onSave={() => handleSaveAi(aiDraft)}
                  onReset={() => setAiDraft(null)}
                />
              )}
            </div>
          )}

          {tab === "import" && (
            <div>
              {!importDraft ? (
                <ImportPicker
                  archiveFile={archiveFile}
                  setArchiveFile={(f) => { setArchiveFile(f); setImportDraft(null); setExtractedFiles([]); setCreateError(null); }}
                  importLoading={importLoading}
                  onImport={handleImportFiles}
                />
              ) : (
                <ImportDraftForm
                  importDraft={importDraft}
                  setImportDraft={setImportDraft}
                  extractedFiles={extractedFiles}
                  submitting={submitting}
                  onReset={() => { setImportDraft(null); setArchiveFile(null); setExtractedFiles([]); }}
                  onSave={handleImportSave}
                />
              )}
            </div>
          )}
        </ModalShell>
      )}

      {/* Your Skills */}
      <div style={{ marginTop: 24 }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {Array.from({ length: 3 }).map((_, i) => <SkillCardSkeleton key={i} />)}
          </div>
        ) : skills.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: "3rem 2rem", textAlign: "center" }}>
            <p style={{ fontSize: 16, color: "var(--foreground)", fontWeight: 600, margin: "0 0 6px" }}>No skills yet</p>
            <p style={{ fontSize: 13, color: "var(--foreground-3)", margin: 0 }}>Create a skill above to get started.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {skills.map((s) => (
              <SkillCard
                key={s.id}
                skill={s}
                deleting={deleting === s.id}
                onEdit={() => setEditingSkill(s)}
                onDelete={() => handleDelete(s.id)}
              />
            ))}
          </div>
        )}
      </div>

      {editingSkill && (
        <EditSkillModal
          skill={editingSkill}
          onClose={() => setEditingSkill(null)}
          onUpdated={() => { setEditingSkill(null); refreshSkills(); }}
        />
      )}

      <SkillsStyles />
    </div>
  );
}

function KeyEditor({
  hasKey, setupProvider, setSetupProvider, setupModel, setSetupModel, setupApiKey, setSetupApiKey,
  providerNames, setupAvailableModels, keyError, savingKey, onCancel, onSave,
}: {
  hasKey: boolean;
  setupProvider: string;
  setSetupProvider: (v: string) => void;
  setupModel: string;
  setSetupModel: (v: string) => void;
  setupApiKey: string;
  setSetupApiKey: (v: string) => void;
  providerNames: string[];
  setupAvailableModels: string[];
  keyError: string | null;
  savingKey: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <KeyRound size={14} style={{ color: ACCENT }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
          {hasKey ? "Update your AI provider key" : "Connect your AI provider"}
        </p>
      </div>
      <p style={{ fontSize: 11, color: "var(--foreground-3)", margin: "0 0 12px", lineHeight: 1.5 }}>
        Choose your provider and model, and paste your API key. We store it securely and reuse it for every skill you generate. (Imports don&apos;t need a key.)
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <label style={labelStyle}>Provider</label>
          <select value={setupProvider} onChange={(e) => setSetupProvider(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">Select provider…</option>
            {providerNames.map((p) => (
              <option key={p} value={p}>{p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Model</label>
          <select value={setupModel} onChange={(e) => setSetupModel(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }} disabled={!setupProvider}>
            <option value="">{setupProvider ? "Select model…" : "Select a provider first"}</option>
            {setupAvailableModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>API Key</label>
        <input
          type="password"
          value={setupApiKey}
          onChange={(e) => setSetupApiKey(e.target.value)}
          placeholder={hasKey ? "Enter a new key to replace the saved one" : "sk-…"}
          style={inputStyle}
          autoComplete="off"
        />
      </div>
      {keyError && (
        <div style={{ background: "rgba(226,61,45,0.08)", border: "1px solid rgba(226,61,45,0.25)", borderRadius: 6, padding: "6px 10px", fontSize: 12, color: "#E23D2D", marginBottom: 10 }}>
          {keyError}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        {hasKey && (
          <button type="button" onClick={onCancel} style={{ flex: 1, padding: "9px 0", background: "var(--surface)", color: "var(--foreground)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={savingKey}
          style={{ flex: hasKey ? 2 : 1, padding: "9px 0", background: savingKey ? "var(--surface-2)" : ACCENT, color: savingKey ? "var(--foreground-3)" : "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: savingKey ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          {savingKey ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <KeyRound size={13} />}
          {hasKey ? "Update Key" : "Save & Continue"}
        </button>
      </div>
    </div>
  );
}

function AiPromptForm({
  keyInfo, aiPrompt, setAiPrompt, generating, onGenerate, onChangeKey,
}: {
  keyInfo: SkillKeyInfo;
  aiPrompt: string;
  setAiPrompt: (v: string) => void;
  generating: boolean;
  onGenerate: () => void;
  onChangeKey: () => void;
}) {
  const disabled = generating || aiPrompt.trim().length < 5;
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--foreground-2)" }}>
          <KeyRound size={13} style={{ color: ACCENT }} />
          <span>
            Using <strong style={{ color: "var(--foreground)" }}>{keyInfo.provider}</strong>
            {keyInfo.model ? ` · ${keyInfo.model}` : ""}
          </span>
        </div>
        <button type="button" onClick={onChangeKey} style={{ background: "transparent", border: "none", color: ACCENT, fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0 }}>
          Change
        </button>
      </div>
      <label style={labelStyle}>Describe the skill you want</label>
      <textarea
        value={aiPrompt}
        onChange={(e) => setAiPrompt(e.target.value)}
        placeholder="e.g. A skill that helps the agent analyze customer feedback and extract sentiment patterns..."
        rows={4}
        style={{ ...inputStyle, resize: "vertical", marginBottom: 16 }}
      />
      <button
        onClick={onGenerate}
        disabled={disabled}
        style={{
          width: "100%", padding: "10px 0",
          background: disabled ? "var(--surface-2)" : ACCENT,
          color: disabled ? "var(--foreground-3)" : "#fff",
          border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600,
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {generating ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Generating...</> : <><Sparkles size={16} /> Generate with AI</>}
      </button>
    </>
  );
}

function AiDraftForm({
  aiDraft, setAiDraft, submitting, onReset, onSave,
}: {
  aiDraft: AiDraft;
  setAiDraft: (v: AiDraft) => void;
  submitting: boolean;
  onReset: () => void;
  onSave: () => void;
}) {
  return (
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
        <button onClick={onReset} style={{ flex: 1, padding: "10px 0", background: "var(--surface-2)", color: "var(--foreground)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Start Over
        </button>
        <button
          onClick={onSave}
          disabled={submitting}
          style={{ flex: 1, padding: "10px 0", background: submitting ? "var(--surface-2)" : ACCENT, color: submitting ? "var(--foreground-3)" : "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          {submitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null} Save Skill
        </button>
      </div>
      {aiDraft.files.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Generated files ({aiDraft.files.length + 1})</label>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", fontSize: 12 }}>
              <FileIcon size={13} style={{ color: "var(--foreground-3)", flexShrink: 0 }} />
              <span style={{ color: "var(--foreground)", flex: 1 }}>SKILL.md</span>
            </div>
            {aiDraft.files.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", fontSize: 12 }}>
                <Folder size={13} style={{ color: ACCENT, flexShrink: 0 }} />
                <span style={{ color: "var(--foreground)", flex: 1 }}>{f.path}</span>
                <span style={{ color: "var(--foreground-3)", flexShrink: 0 }}>{f.content.length} B</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ImportPicker({
  archiveFile, setArchiveFile, importLoading, onImport,
}: {
  archiveFile: File | null;
  setArchiveFile: (f: File | null) => void;
  importLoading: boolean;
  onImport: () => void;
}) {
  const disabled = !archiveFile || importLoading;
  return (
    <>
      <p style={{ fontSize: 13, color: "var(--foreground-2)", marginTop: 0, marginBottom: 16, lineHeight: 1.5 }}>
        Import a skill from a <code style={{ background: "var(--surface-2)", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>.zip</code> archive containing a <code style={{ background: "var(--surface-2)", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>SKILL.md</code> file, scripts, and any additional files the skill needs.
      </p>
      <label style={labelStyle}>Skill Archive (.zip)</label>
      <label style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "16px 14px",
        border: archiveFile ? "1.5px solid rgba(255,77,0,0.4)" : "1.5px dashed var(--border)",
        borderRadius: 10, cursor: "pointer", marginBottom: 16,
        background: archiveFile ? "rgba(255,77,0,0.04)" : "transparent",
      }}>
        <Archive size={20} style={{ color: archiveFile ? ACCENT : "var(--foreground-3)", flexShrink: 0 }} />
        <div style={{ overflow: "hidden" }}>
          <span style={{ fontSize: 13, color: archiveFile ? "var(--foreground)" : "var(--foreground-3)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {archiveFile ? archiveFile.name : "Click to select a .zip archive"}
          </span>
          {archiveFile && <span style={{ fontSize: 11, color: "var(--foreground-3)", marginTop: 2, display: "block" }}>{(archiveFile.size / 1024).toFixed(1)} KB</span>}
        </div>
        <input
          type="file"
          accept=".zip"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setArchiveFile(f); }}
        />
      </label>
      <button
        onClick={onImport}
        disabled={disabled}
        style={{
          width: "100%", padding: "10px 0",
          background: disabled ? "var(--surface-2)" : ACCENT,
          color: disabled ? "var(--foreground-3)" : "#fff",
          border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600,
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {importLoading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Archive size={16} />}
        {importLoading ? "Extracting..." : "Extract & Parse"}
      </button>
    </>
  );
}

function ImportDraftForm({
  importDraft, setImportDraft, extractedFiles, submitting, onReset, onSave,
}: {
  importDraft: ImportDraft;
  setImportDraft: (v: ImportDraft) => void;
  extractedFiles: ExtractedFile[];
  submitting: boolean;
  onReset: () => void;
  onSave: () => void;
}) {
  return (
    <>
      <p style={{ fontSize: 12, color: "var(--foreground-3)", marginBottom: 12, marginTop: 0 }}>Review the imported skill, then save.</p>
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
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 0", maxHeight: 160, overflowY: "auto" }}>
          {extractedFiles.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", fontSize: 12 }}>
              {f.path.includes("/") ? <Folder size={13} style={{ color: ACCENT, flexShrink: 0 }} /> : <FileIcon size={13} style={{ color: "var(--foreground-3)", flexShrink: 0 }} />}
              <span style={{ color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{f.path}</span>
              <span style={{ color: "var(--foreground-3)", flexShrink: 0 }}>{f.size < 1024 ? `${f.size} B` : `${(f.size / 1024).toFixed(1)} KB`}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onReset} style={{ flex: 1, padding: "10px 0", background: "var(--surface-2)", color: "var(--foreground)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Choose Another
        </button>
        <button
          onClick={onSave}
          disabled={submitting}
          style={{ flex: 1, padding: "10px 0", background: submitting ? "var(--surface-2)" : ACCENT, color: submitting ? "var(--foreground-3)" : "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          {submitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null} Import Skill
        </button>
      </div>
    </>
  );
}
