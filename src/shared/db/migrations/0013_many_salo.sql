CREATE TABLE "agent_subscription" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"agent_id" uuid,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"status" text DEFAULT 'incomplete' NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_subscription_agent_id_unique" UNIQUE("agent_id"),
	CONSTRAINT "agent_subscription_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "skill_api_key" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"api_provider" text NOT NULL,
	"api_key" text NOT NULL,
	"agent_model" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skill_api_key_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "agent_creation_feedback" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"agent_id" uuid,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "referral_code" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "free_agent_credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_subscription" ADD CONSTRAINT "agent_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_subscription" ADD CONSTRAINT "agent_subscription_agent_id_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_api_key" ADD CONSTRAINT "skill_api_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_creation_feedback" ADD CONSTRAINT "agent_creation_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_creation_feedback" ADD CONSTRAINT "agent_creation_feedback_agent_id_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_subscription_userId_idx" ON "agent_subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_subscription_agentId_idx" ON "agent_subscription" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_subscription_stripeSubscriptionId_idx" ON "agent_subscription" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "skill_api_key_userId_idx" ON "skill_api_key" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_creation_feedback_userId_idx" ON "agent_creation_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_creation_feedback_agentId_idx" ON "agent_creation_feedback" USING btree ("agent_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_referral_code_unique" UNIQUE("referral_code");