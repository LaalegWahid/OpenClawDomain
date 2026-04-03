import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

// Single-row global config table.
// The row with id='default' is the active config — created on first admin toggle.
export const systemConfig = pgTable("system_config", {
  id: text("id").primaryKey().default("default"),
  serviceEnabled: boolean("service_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
