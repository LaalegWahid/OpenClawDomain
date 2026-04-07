import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  jsonb,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { agentSkill } from "./skill";

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
    isPrimary: boolean("is_primary").default(false).notNull(),
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

export const agentChannel = pgTable(
  "agent_channel",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agent.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(), // "discord" | "whatsapp"
    credentials: jsonb("credentials").notNull(), // { botToken } or { accountSid, authToken, fromNumber }
    enabled: boolean("enabled").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("agent_channel_agentId_idx").on(table.agentId)],
);

export const agentMcp = pgTable(
  "agent_mcp",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agent.id, { onDelete: "cascade" }),
    serverName: text("server_name").notNull(),
    transport: text("transport").notNull(), // "stdio" | "http"
    config: jsonb("config").notNull(), // { command, args, env } or { url, headers }
    enabled: boolean("enabled").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("agent_mcp_agentId_idx").on(table.agentId)],
);

export const whatsappLinkSession = pgTable(
  "whatsapp_link_session",
  {
    id: uuid("id").default(sql`pg_catalog.gen_random_uuid()`).primaryKey(),
    agentId: uuid("agent_id").notNull().references(() => agent.id, { onDelete: "cascade" }),
    taskArn: text("task_arn"),
    status: text("status").notNull().default("pending"), // pending | qr_ready | linked | failed | expired
    qrData: text("qr_data"),
    ownerPhone: text("owner_phone"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [index("whatsapp_link_agentId_idx").on(table.agentId)],
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const agentRelations = relations(agent, ({ one, many }) => ({
  user: one(user, {
    fields: [agent.userId],
    references: [user.id],
  }),
  activities: many(agentActivity),
  chatSessions: many(chatSession),
  channels: many(agentChannel),
  mcpServers: many(agentMcp),
  skills: many(agentSkill),
}));

export const agentActivityRelations = relations(agentActivity, ({ one }) => ({
  agent: one(agent, {
    fields: [agentActivity.agentId],
    references: [agent.id],
  }),
}));

export const chatSessionRelations = relations(chatSession, ({ one }) => ({
  agent: one(agent, {
    fields: [chatSession.agentId],
    references: [agent.id],
  }),
}));

export const agentChannelRelations = relations(agentChannel, ({ one }) => ({
  agent: one(agent, {
    fields: [agentChannel.agentId],
    references: [agent.id],
  }),
}));

export const agentMcpRelations = relations(agentMcp, ({ one }) => ({
  agent: one(agent, {
    fields: [agentMcp.agentId],
    references: [agent.id],
  }),
}));

export const whatsappLinkSessionRelations = relations(whatsappLinkSession, ({ one }) => ({
  agent: one(agent, {
    fields: [whatsappLinkSession.agentId],
    references: [agent.id],
  }),
}));
