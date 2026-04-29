import { pgTable, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";

export const referral = pgTable(
  "referral",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    referrerId: uuid("referrer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    referredId: uuid("referred_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("referral_referrerId_idx").on(table.referrerId),
    index("referral_referredId_idx").on(table.referredId),
  ],
);

export const referralRelations = relations(referral, ({ one }) => ({
  referrer: one(user, { fields: [referral.referrerId], references: [user.id] }),
  referred: one(user, { fields: [referral.referredId], references: [user.id] }),
}));
