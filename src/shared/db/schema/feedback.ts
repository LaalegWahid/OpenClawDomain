import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, integer, index } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { agent } from "./agent";

export const agentCreationFeedback = pgTable(
  "agent_creation_feedback",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agent.id, { onDelete: "set null" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("agent_creation_feedback_userId_idx").on(table.userId),
    index("agent_creation_feedback_agentId_idx").on(table.agentId),
  ],
);
