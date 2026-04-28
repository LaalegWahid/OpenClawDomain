export interface SkillFile {
  key?: string;
  filename: string;
  size: number;
  contentType: string;
}

export interface SkillRecord {
  id: string;
  name: string;
  description: string;
  instructions: string;
  source: string;
  files: SkillFile[];
  createdAt: string;
}

export interface SkillKeyInfo {
  hasKey: boolean;
  provider?: string;
  model?: string;
}

export interface AiDraftFile {
  path: string;
  content: string;
}

export interface AiDraft {
  name: string;
  description: string;
  instructions: string;
  files: AiDraftFile[];
}

export interface ImportDraft {
  name: string;
  description: string;
  instructions: string;
}

export interface ExtractedFile {
  path: string;
  blob: Blob;
  size: number;
}
