import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "./client";
import { env } from "../../config/env";

function bucket() {
  const b = env.S3_SKILLS_BUCKET;
  if (!b) throw new Error("S3_SKILLS_BUCKET is not configured");
  return b;
}

export async function uploadSkillFile(
  userId: string,
  skillId: string,
  filename: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const key = `${userId}/${skillId}/${filename}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

export async function getSkillFileUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

export async function getSkillFileBuffer(key: string): Promise<Buffer> {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
  );
  const body = res.Body as unknown as { transformToByteArray?: () => Promise<Uint8Array> } | undefined;
  if (!body?.transformToByteArray) {
    throw new Error(`S3 object ${key} returned no body`);
  }
  const bytes = await body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function deleteSkillFiles(
  userId: string,
  skillId: string,
): Promise<void> {
  const prefix = `${userId}/${skillId}/`;
  const list = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucket(),
      Prefix: prefix,
    }),
  );

  const objects = list.Contents;
  if (!objects || objects.length === 0) return;

  await s3.send(
    new DeleteObjectsCommand({
      Bucket: bucket(),
      Delete: {
        Objects: objects.map((o) => ({ Key: o.Key })),
      },
    }),
  );
}

export async function listSkillFiles(
  userId: string,
  skillId: string,
): Promise<{ key: string; size: number; lastModified?: Date }[]> {
  const prefix = `${userId}/${skillId}/`;
  const list = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucket(),
      Prefix: prefix,
    }),
  );

  return (list.Contents ?? []).map((o) => ({
    key: o.Key!,
    size: o.Size ?? 0,
    lastModified: o.LastModified,
  }));
}
