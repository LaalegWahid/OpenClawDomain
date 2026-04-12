import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  index,
  integer,
  decimal,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const processedStripeEvent = pgTable(
  "processed_stripe_event",
  {
    eventId: text("event_id").primaryKey(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);

// ── Billing status meanings ────────────────────────────────────────────────
// trial      – within the 15-day free window (first agent only)
// active     – card on file, up to date
// past_due   – last charge failed; agents still running, warning sent
// suspended  – second failed charge or no card after trial; agents stopped
// canceled   – user deleted account / manually canceled
// incomplete – card being set up (transitional)
// unpaid     – legacy value kept for backward-compat

export const subscription = pgTable(
  "subscription",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),

    // ── Status ──────────────────────────────────────────────────
    status: text("status", {
      enum: ["trial", "active", "past_due", "suspended", "canceled", "incomplete", "unpaid"],
    })
      .default("trial")
      .notNull(),

    // ── Pay-as-you-go billing cycle ──────────────────────────────
    // Auto-computed tier based on running agent count:
    //   1-5  agents → "starter"  $20/agent
    //   6-10 agents → "growth"   $18/agent
    //   11-20 agents → "scale"   $15/agent
    tier: text("tier", { enum: ["starter", "growth", "scale"] }),
    pricePerAgent: decimal("price_per_agent", { precision: 10, scale: 2 }),
    // Agent count snapshot captured at last billing
    agentCount: integer("agent_count").default(0),
    // When the 30-day billing cycle last ran (null = never charged yet)
    lastBilledAt: timestamp("last_billed_at"),
    // Next scheduled charge date (lastBilledAt + 30 days)
    nextBilledAt: timestamp("next_billed_at"),

    // ── Stripe payment intent tracking ──────────────────────────
    // We use manual PaymentIntents (not Stripe Subscriptions) for full control.
    // Kept nullable; stripeSubscriptionId only populated for legacy rows.
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    stripePriceId: text("stripe_price_id"),
    // ID of the last PaymentIntent we created for auditing
    lastPaymentIntentId: text("last_payment_intent_id"),

    // ── Cancellation ────────────────────────────────────────────
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    canceledAt: timestamp("canceled_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("subscription_userId_idx").on(table.userId),
    index("subscription_stripeSubscriptionId_idx").on(table.stripeSubscriptionId),
  ],
);

export const paymentMethod = pgTable(
  "payment_method",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    stripePaymentMethodId: text("stripe_payment_method_id").notNull().unique(),
    brand: text("brand"),
    last4: text("last4"),
    expMonth: integer("exp_month"),
    expYear: integer("exp_year"),
    isDefault: boolean("is_default").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("paymentMethod_userId_idx").on(table.userId),
    index("paymentMethod_stripePaymentMethodId_idx").on(table.stripePaymentMethodId),
  ],
);

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  user: one(user, {
    fields: [subscription.userId],
    references: [user.id],
  }),
}));

export const paymentMethodRelations = relations(paymentMethod, ({ one }) => ({
  user: one(user, {
    fields: [paymentMethod.userId],
    references: [user.id],
  }),
}));
