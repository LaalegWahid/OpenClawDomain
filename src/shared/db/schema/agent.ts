import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  integer,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const agent = pgTable(
  "agent",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: text("status").notNull().default("starting"), // "active" | "starting" | "stopped" | "error"
    botToken: text("bot_token").notNull(),
    botUsername: text("bot_username").notNull(),
    systemPrompt: text("system_prompt").notNull(),
    type: text("type").notNull().default("finance"), // "finance" | "marketing" | "operations"
    containerId: text("container_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("agent_userId_idx").on(table.userId),
    uniqueIndex("agent_botToken_idx").on(table.botToken),
    uniqueIndex("agent_botUsername_idx").on(table.botUsername),
  ],
);

export const agentActivity = pgTable(
  "agent_activity",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agent.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    message: text("message").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("agent_activity_agentId_idx").on(table.agentId)],
);

export const chatSession = pgTable(
  "chat_session",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agent.id, { onDelete: "cascade" }),
    chatId: text("chat_id").notNull(),
    lastResponseId: text("last_response_id"),
    history: jsonb("history").default([]), // [{role: "user"|"assistant", content: string}]
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("chat_session_agent_chat_idx").on(table.agentId, table.chatId),
  ],
);

export const chatSessionRelations = relations(chatSession, ({ one }) => ({
  agent: one(agent, {
    fields: [chatSession.agentId],
    references: [agent.id],
  }),
}));

export const agentRelations = relations(agent, ({ one, many }) => ({
  user: one(user, {
    fields: [agent.userId],
    references: [user.id],
  }),
  activities: many(agentActivity),
  chatSessions: many(chatSession),
}));

export const agentActivityRelations = relations(agentActivity, ({ one }) => ({
  agent: one(agent, {
    fields: [agentActivity.agentId],
    references: [agent.id],
  }),
}));
