import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const domainConfig = pgTable(
  "domain_config",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    agentType: text("agent_type").notNull(),
    label: text("label").notNull(),
    boundaryPreamble: text("boundary_preamble").notNull(),
    skills: jsonb("skills").notNull(), // Skill[]
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("domain_config_agent_type_idx").on(table.agentType)],
);
