ALTER TABLE "billing_alert" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "billing_alert" CASCADE;--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "status" SET DEFAULT 'incomplete';--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "current_period_start" timestamp;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "current_period_end" timestamp;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "trial_started_at";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "trial_ends_at";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "trial_used";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "tier";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "price_per_agent";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "agent_count";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "last_billed_at";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "next_billed_at";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "last_payment_intent_id";