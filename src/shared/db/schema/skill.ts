import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { agent } from "./agent";

export const skill = pgTable(
  "skill",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    instructions: text("instructions").notNull(),
    source: text("source").notNull().default("manual"), // "manual" | "ai" | "import"
    files: jsonb("files").default([]), // [{key, filename, size, contentType}]
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("skill_userId_idx").on(table.userId),
    uniqueIndex("skill_userId_name_idx").on(table.userId, table.name),
  ],
);

export const skillApiKey = pgTable(
  "skill_api_key",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    apiProvider: text("api_provider").notNull(),
    apiKey: text("api_key").notNull(),
    agentModel: text("agent_model").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("skill_api_key_userId_idx").on(table.userId)],
);

export const agentSkill = pgTable(
  "agent_skill",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agent.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skill.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("agent_skill_agent_skill_idx").on(table.agentId, table.skillId),
    index("agent_skill_skillId_idx").on(table.skillId),
  ],
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const skillRelations = relations(skill, ({ one, many }) => ({
  user: one(user, {
    fields: [skill.userId],
    references: [user.id],
  }),
  agentSkills: many(agentSkill),
}));

export const agentSkillRelations = relations(agentSkill, ({ one }) => ({
  agent: one(agent, {
    fields: [agentSkill.agentId],
    references: [agent.id],
  }),
  skill: one(skill, {
    fields: [agentSkill.skillId],
    references: [skill.id],
  }),
}));
