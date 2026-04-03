import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const systemConfig = pgTable("system_config", {
  id: text("id").primaryKey().default("default").notNull(),
  serviceEnabled: boolean("service_enabled").default(true).notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`now()`)
    .$onUpdate(() => new Date())
    .notNull(),
});