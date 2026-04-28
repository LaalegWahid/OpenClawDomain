import type { AiDraft, ExtractedFile, ImportDraft, SkillFile, SkillKeyInfo, SkillRecord } from "../components/shared/types";

export async function fetchSkills(): Promise<SkillRecord[]> {
  const res = await fetch("/api/skills");
  if (!res.ok) return [];
  const data = await res.json();
  return data.skills ?? [];
}

export async function fetchSkillFiles(skillId: string): Promise<SkillFile[]> {
  const res = await fetch(`/api/skills/${skillId}/files`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.files ?? [];
}

export async function deleteSkill(id: string): Promise<boolean> {
  const res = await fetch(`/api/skills/${id}`, { method: "DELETE" });
  return res.ok;
}

export async function updateSkill(
  id: string,
  payload: { name: string; description: string; instructions: string },
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/skills/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, error: data.error };
}

export async function fetchSkillKeyInfo(): Promise<SkillKeyInfo> {
  try {
    const res = await fetch("/api/skills/api-key");
    if (!res.ok) return { hasKey: false };
    const data = await res.json();
    return { hasKey: !!data.hasKey, provider: data.provider, model: data.model };
  } catch {
    return { hasKey: false };
  }
}

export async function saveSkillKey(payload: { provider: string; model: string; apiKey: string }) {
  const res = await fetch("/api/skills/api-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, error: data.error as string | undefined };
}

export async function fetchModelsCatalog(): Promise<Record<string, string[]>> {
  try {
    const res = await fetch("/models.json");
    return await res.json();
  } catch {
    return {};
  }
}

export async function generateAiSkill(prompt: string) {
  const res = await fetch("/api/skills/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

export async function createSkillRecord(payload: { name: string; description: string; instructions: string; source: string }) {
  const res = await fetch("/api/skills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

export async function uploadSkillFiles(skillId: string, formData: FormData) {
  const res = await fetch(`/api/skills/${skillId}/files`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, error: data.error as string | undefined };
}

export async function importSkillFromMd(skillMdBlob: Blob): Promise<{ ok: boolean; data: { skill: ImportDraft; error?: string } }> {
  const formData = new FormData();
  formData.append("skillMd", skillMdBlob, "SKILL.md");
  const res = await fetch("/api/skills/import", { method: "POST", body: formData });
  const data = await res.json();
  return { ok: res.ok, data };
}

/**
 * Reads a .zip and returns the extracted skill files. Throws an Error with a
 * user-facing message on validation failure (caller surfaces it as form error).
 */
export async function extractSkillArchive(archive: File): Promise<ExtractedFile[]> {
  if (archive.size > 20 * 1024 * 1024) throw new Error("Archive must be smaller than 20MB");

  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(archive);

  let skillMdEntry = zip.file("SKILL.md");
  let prefix = "";
  if (!skillMdEntry) {
    const topDirs = Object.keys(zip.files).filter((n) => n.endsWith("/") && !n.slice(0, -1).includes("/"));
    if (topDirs.length === 1) {
      skillMdEntry = zip.file(topDirs[0] + "SKILL.md");
      if (skillMdEntry) prefix = topDirs[0];
    }
  }
  if (!skillMdEntry) throw new Error("Archive must contain a SKILL.md file at the root");

  const entries = Object.values(zip.files).filter(
    (f) => !f.dir && !f.name.startsWith("__MACOSX") && !f.name.endsWith(".DS_Store") && !f.name.includes("..") && !f.name.startsWith("/"),
  );
  if (entries.length > 20) throw new Error("Archive contains too many files (maximum 20)");

  const files: ExtractedFile[] = [];
  let totalSize = 0;
  for (const entry of entries) {
    const blob = await entry.async("blob");
    if (blob.size > 5 * 1024 * 1024) throw new Error(`File "${entry.name}" exceeds 5MB limit`);
    totalSize += blob.size;
    if (totalSize > 25 * 1024 * 1024) throw new Error("Total extracted size exceeds 25MB");
    const path = prefix ? entry.name.slice(prefix.length) : entry.name;
    files.push({ path, blob, size: blob.size });
  }
  return files;
}

/**
 * Builds a multipart form for uploading the AI-generated skill to the
 * `/api/skills/<id>/files` endpoint (SKILL.md + supporting files).
 */
export function buildAiSkillFormData(draft: AiDraft): FormData {
  const escaped = (s: string) => s.replace(/"/g, '\\"');
  const skillMd = `---\nname: ${draft.name}\ndescription: "${escaped(draft.description)}"\n---\n\n${draft.instructions}\n`;

  const fileForm = new FormData();
  const paths: string[] = [];
  fileForm.append("files", new Blob([skillMd], { type: "text/markdown" }), "SKILL.md");
  paths.push("SKILL.md");
  for (const f of draft.files) {
    const filename = f.path.split("/").pop()!;
    const mime = f.path.endsWith(".py") ? "text/x-python" : "text/x-shellscript";
    fileForm.append("files", new Blob([f.content], { type: mime }), filename);
    paths.push(f.path);
  }
  fileForm.append("paths", JSON.stringify(paths));
  return fileForm;
}

export function buildExtractedFilesFormData(files: ExtractedFile[]): FormData {
  const fileForm = new FormData();
  const paths: string[] = [];
  for (const f of files) {
    fileForm.append("files", f.blob, f.path.split("/").pop()!);
    paths.push(f.path);
  }
  fileForm.append("paths", JSON.stringify(paths));
  return fileForm;
}
