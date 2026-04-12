import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// ── Alert types ────────────────────────────────────────────────────────────
// trial_started   – "Your first agent is free for 15 days"
// trial_reminder  – Days 10-14: "Add a card to keep it running"
// trial_expired   – Day 15, no card → agent stopped
// card_missing    – Non-trial user has no card on file
// payment_failed  – Stripe charge failed
// payment_success – Charge succeeded (optional confirmation)
// suspended       – All agents stopped due to non-payment

export type BillingAlertType =
  | "trial_started"
  | "trial_reminder"
  | "trial_expired"
  | "card_missing"
  | "payment_failed"
  | "payment_success"
  | "suspended";

export const billingAlert = pgTable(
  "billing_alert",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    type: text("type").$type<BillingAlertType>().notNull(),
    message: text("message").notNull(),

    // Dismissed by the user in the dashboard
    isRead: boolean("is_read").default(false).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("billing_alert_userId_idx").on(table.userId),
    index("billing_alert_isRead_idx").on(table.isRead),
  ],
);

export const billingAlertRelations = relations(billingAlert, ({ one }) => ({
  user: one(user, {
    fields: [billingAlert.userId],
    references: [user.id],
  }),
}));
