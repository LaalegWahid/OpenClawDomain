CREATE TABLE "billing_alert" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "status" SET DEFAULT 'trial';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "trial_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "trial_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "trial_used" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "tier" text;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "price_per_agent" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "agent_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "last_billed_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "next_billed_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "last_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "billing_alert" ADD CONSTRAINT "billing_alert_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_alert_userId_idx" ON "billing_alert" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "billing_alert_isRead_idx" ON "billing_alert" USING btree ("is_read");--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "current_period_start";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "current_period_end";