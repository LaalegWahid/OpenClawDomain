"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Upload, Pencil, Check, X, Loader2, Download } from "lucide-react";
import {
  type AdminModel,
  createAdminModel,
  deleteAdminModel,
  fetchAdminModels,
  importAdminModels,
  updateAdminModel,
} from "../actions/admin.actions";
import {
  ACCENT,
  BORDER,
  CARD,
  ErrorBanner,
  IconAction,
  INK,
  MUTED,
  SearchInput,
  SUCCESS,
} from "./shared";

export function ModelsManager() {
  const [models, setModels] = useState<AdminModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Add form
  const [newProvider, setNewProvider] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit row
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProvider, setEditProvider] = useState("");
  const [editName, setEditName] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Import
  const [importOpen, setImportOpen] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importReplace, setImportReplace] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchAdminModels();
        if (!cancelled) setModels(list);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load models");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const flashInfo = (msg: string) => {
    setInfo(msg);
    setTimeout(() => setInfo(null), 2500);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter(
      (m) => m.provider.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
    );
  }, [models, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, AdminModel[]>();
    for (const m of filtered) {
      if (!map.has(m.provider)) map.set(m.provider, []);
      map.get(m.provider)!.push(m);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  async function onAdd() {
    if (!newProvider.trim() || !newName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const created = await createAdminModel({
        provider: newProvider.trim(),
        name: newName.trim(),
      });
      setModels((list) => [...list, created].sort(sortModels));
      setNewName("");
      flashInfo("Model added");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add model");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(m: AdminModel) {
    setEditingId(m.id);
    setEditProvider(m.provider);
    setEditName(m.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditProvider("");
    setEditName("");
  }

  async function saveEdit(m: AdminModel) {
    if (!editProvider.trim() || !editName.trim()) return;
    if (editProvider.trim() === m.provider && editName.trim() === m.name) {
      cancelEdit();
      return;
    }
    setPendingId(m.id);
    setError(null);
    try {
      const updated = await updateAdminModel(m.id, {
        provider: editProvider.trim(),
        name: editName.trim(),
      });
      setModels((list) => list.map((x) => (x.id === m.id ? updated : x)).sort(sortModels));
      cancelEdit();
      flashInfo("Model updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update model");
    } finally {
      setPendingId(null);
    }
  }

  async function onDelete(m: AdminModel) {
    if (!confirm(`Delete ${m.provider} / ${m.name}?`)) return;
    setPendingId(m.id);
    setError(null);
    try {
      await deleteAdminModel(m.id);
      setModels((list) => list.filter((x) => x.id !== m.id));
      flashInfo("Model deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete model");
    } finally {
      setPendingId(null);
    }
  }

  async function onImport() {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(importJson);
    } catch {
      setError("Invalid JSON");
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      setError("JSON must be an object: { provider: string[] }");
      return;
    }
    const catalog: Record<string, string[]> = {};
    for (const [provider, names] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(names)) {
        setError(`Provider "${provider}" must map to an array of strings`);
        return;
      }
      catalog[provider] = names.filter((n): n is string => typeof n === "string");
    }
    setImporting(true);
    try {
      const result = await importAdminModels({ catalog, replace: importReplace });
      setModels(result.models);
      setImportJson("");
      setImportOpen(false);
      setImportReplace(false);
      flashInfo(`Imported ${result.inserted} entries`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import models");
    } finally {
      setImporting(false);
    }
  }

  function exportJson() {
    const catalog: Record<string, string[]> = {};
    for (const m of models) {
      if (!catalog[m.provider]) catalog[m.provider] = [];
      catalog[m.provider].push(m.name);
    }
    const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "models.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search provider or model"
          width={260}
        />
        <div style={{ display: "inline-flex", gap: 8 }}>
          <button
            type="button"
            onClick={exportJson}
            disabled={models.length === 0}
            style={btnGhost}
          >
            <Download size={14} /> Export JSON
          </button>
          <button
            type="button"
            onClick={() => setImportOpen((v) => !v)}
            style={btnGhost}
          >
            <Upload size={14} /> {importOpen ? "Cancel import" : "Import JSON"}
          </button>
        </div>
      </div>

      {info && (
        <div
          style={{
            fontSize: 12,
            color: SUCCESS,
            background: "rgba(76,175,80,0.08)",
            border: "1px solid rgba(76,175,80,0.25)",
            borderRadius: 8,
            padding: "8px 12px",
          }}
        >
          {info}
        </div>
      )}
      {error && <ErrorBanner message={error} />}

      {/* Import panel */}
      {importOpen && (
        <div
          style={{
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: 14,
            background: "rgba(42,31,25,0.02)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, color: MUTED }}>
            Paste a catalog object: <code>{`{ "anthropic": ["claude-..."], "openai": [...] }`}</code>
          </div>
          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder='{"anthropic":["claude-opus-4-6"], "openai":["gpt-5"]}'
            rows={8}
            spellCheck={false}
            style={{
              width: "100%",
              fontFamily: "monospace",
              fontSize: 12,
              padding: 10,
              borderRadius: 8,
              border: `1px solid ${BORDER}`,
              background: CARD,
              color: INK,
              resize: "vertical",
            }}
          />
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: MUTED }}>
            <input
              type="checkbox"
              checked={importReplace}
              onChange={(e) => setImportReplace(e.target.checked)}
            />
            Replace existing catalog (delete all current models first)
          </label>
          <div>
            <button
              type="button"
              onClick={onImport}
              disabled={importing || !importJson.trim()}
              style={btnPrimary(importing || !importJson.trim())}
            >
              {importing ? <Loader2 size={14} className="oc-models-spin" /> : <Upload size={14} />}
              {importing ? "Importingâ€¦" : "Import"}
            </button>
          </div>
        </div>
      )}

      {/* Add row */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          border: `1px dashed ${BORDER}`,
          borderRadius: 10,
          padding: 10,
        }}
      >
        <input
          type="text"
          value={newProvider}
          onChange={(e) => setNewProvider(e.target.value)}
          placeholder="Provider (e.g. anthropic)"
          style={{ ...textInput, minWidth: 180 }}
        />
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Model name (e.g. claude-opus-4-6)"
          onKeyDown={(e) => {
            if (e.key === "Enter") onAdd();
          }}
          style={{ ...textInput, flex: 1, minWidth: 220 }}
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={adding || !newProvider.trim() || !newName.trim()}
          style={btnPrimary(adding || !newProvider.trim() || !newName.trim())}
        >
          {adding ? <Loader2 size={14} className="oc-models-spin" /> : <Plus size={14} />} Add model
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 13 }}>
          Loading modelsâ€¦
        </div>
      ) : grouped.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 13 }}>
          {models.length === 0 ? "No models yet â€” add one above or import a JSON catalog." : "No models match this search."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {grouped.map(([provider, list]) => (
            <div key={provider}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: MUTED,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ color: ACCENT }}>{provider}</span>
                <span>Â· {list.length}</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <tbody>
                    {list.map((m) => {
                      const isEditing = editingId === m.id;
                      return (
                        <tr key={m.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                          <td style={{ padding: "8px 12px", width: 200 }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editProvider}
                                onChange={(e) => setEditProvider(e.target.value)}
                                style={{ ...textInput, width: "100%" }}
                              />
                            ) : (
                              <span style={{ color: MUTED, fontSize: 12 }}>{m.provider}</span>
                            )}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit(m);
                                  if (e.key === "Escape") cancelEdit();
                                }}
                                style={{ ...textInput, width: "100%", fontFamily: "monospace" }}
                              />
                            ) : (
                              <span style={{ fontFamily: "monospace", fontSize: 12 }}>{m.name}</span>
                            )}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                            <div style={{ display: "inline-flex", gap: 6 }}>
                              {isEditing ? (
                                <>
                                  <IconAction
                                    title="Save"
                                    disabled={pendingId === m.id || !editProvider.trim() || !editName.trim()}
                                    onClick={() => saveEdit(m)}
                                  >
                                    <Check size={14} />
                                  </IconAction>
                                  <IconAction
                                    title="Cancel"
                                    disabled={pendingId === m.id}
                                    onClick={cancelEdit}
                                  >
                                    <X size={14} />
                                  </IconAction>
                                </>
                              ) : (
                                <>
                                  <IconAction
                                    title="Edit"
                                    disabled={pendingId === m.id || editingId !== null}
                                    onClick={() => startEdit(m)}
                                  >
                                    <Pencil size={14} />
                                  </IconAction>
                                  <IconAction
                                    title="Delete"
                                    disabled={pendingId === m.id}
                                    onClick={() => onDelete(m)}
                                    danger
                                  >
                                    <Trash2 size={14} />
                                  </IconAction>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .oc-models-spin { animation: oc-models-spin 1s linear infinite; }
        @keyframes oc-models-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function sortModels(a: AdminModel, b: AdminModel) {
  if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
  return a.name.localeCompare(b.name);
}

const textInput: React.CSSProperties = {
  fontSize: 13,
  padding: "8px 10px",
  borderRadius: 8,
  border: `1px solid ${BORDER}`,
  background: CARD,
  color: INK,
  outline: "none",
};

const btnGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 600,
  padding: "8px 12px",
  borderRadius: 8,
  border: `1px solid ${BORDER}`,
  background: "transparent",
  color: INK,
  cursor: "pointer",
};

const btnPrimary = (disabled: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 14px",
  borderRadius: 8,
  border: "none",
  background: ACCENT,
  color: "#fff",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.55 : 1,
});


