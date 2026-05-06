import "server-only";
import { asc } from "drizzle-orm";
import { db } from "../drizzle";
import { aiModel } from "../../db/schema/ai-model";

export async function getModelsCatalog(): Promise<Record<string, string[]>> {
  const rows = await db
    .select({ provider: aiModel.provider, name: aiModel.name })
    .from(aiModel)
    .orderBy(asc(aiModel.provider), asc(aiModel.name));

  const catalog: Record<string, string[]> = {};
  for (const r of rows) {
    if (!catalog[r.provider]) catalog[r.provider] = [];
    catalog[r.provider].push(r.name);
  }
  return catalog;
}

export async function listModels() {
  return db
    .select()
    .from(aiModel)
    .orderBy(asc(aiModel.provider), asc(aiModel.name));
}
