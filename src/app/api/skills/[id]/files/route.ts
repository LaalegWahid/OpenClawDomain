import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../shared/lib/drizzle";
import { eq, and } from "drizzle-orm";
import { skill } from "../../../../../shared/db/schema/skill";
import { uploadSkillFile, getSkillFileUrl } from "../../../../../shared/lib/s3/skills";
import { logger } from "../../../../../shared/lib/logger";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 20;

interface SkillFile {
  key: string;
  filename: string;
  size: number;
  contentType: string;
}

async function getOwnedSkill(req: Request, skillId: string) {
  const session = await getSessionOrThrow(req);
  const [found] = await db
    .select()
    .from(skill)
    .where(and(eq(skill.id, skillId), eq(skill.userId, session.user.id)));

  if (!found) throw new Error("NotFound");
  return { session, skill: found };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { skill: found } = await getOwnedSkill(req, id);
    const files = (found.files as SkillFile[]) ?? [];

    const filesWithUrls = await Promise.all(
      files.map(async (f) => ({
        ...f,
        url: await getSkillFileUrl(f.key),
      })),
    );

    return NextResponse.json({ files: filesWithUrls });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "NotFound") return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    logger.error({ err }, "GET /api/skills/[id]/files failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { session, skill: found } = await getOwnedSkill(req, id);
    const existingFiles = (found.files as SkillFile[]) ?? [];

    const formData = await req.formData();
    const uploadedFiles = formData.getAll("files");

    if (!uploadedFiles.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (existingFiles.length + uploadedFiles.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files per skill` },
        { status: 400 },
      );
    }

    // Optional paths array to preserve folder hierarchy from archives
    const pathsRaw = formData.get("paths");
    let pathList: string[] | null = null;
    if (pathsRaw && typeof pathsRaw === "string") {
      try {
        pathList = JSON.parse(pathsRaw);
      } catch {
        return NextResponse.json({ error: "Invalid paths format" }, { status: 400 });
      }
      // Validate: no path traversal
      if (pathList && pathList.some((p) => p.includes("..") || p.startsWith("/"))) {
        return NextResponse.json({ error: "Invalid file path detected" }, { status: 400 });
      }
    }

    const newFiles: SkillFile[] = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      if (!(file instanceof Blob)) continue;

      const f = file as File;
      if (f.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${f.name}" exceeds 5MB limit` },
          { status: 400 },
        );
      }

      const filename = pathList && pathList[i] ? pathList[i] : f.name;
      const buffer = Buffer.from(await f.arrayBuffer());
      const key = await uploadSkillFile(
        session.user.id,
        found.id,
        filename,
        buffer,
        f.type || "application/octet-stream",
      );

      newFiles.push({
        key,
        filename,
        size: f.size,
        contentType: f.type || "application/octet-stream",
      });
    }

    const allFiles = [...existingFiles, ...newFiles];

    await db
      .update(skill)
      .set({ files: allFiles })
      .where(eq(skill.id, found.id));

    return NextResponse.json({ files: allFiles }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "NotFound") return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    logger.error({ err }, "POST /api/skills/[id]/files failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
