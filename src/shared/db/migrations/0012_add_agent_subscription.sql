CREATE TABLE IF NOT EXISTS "agent_subscription" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() PRIMARY KEY,
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "agent_id" uuid UNIQUE REFERENCES "agent"("id") ON DELETE SET NULL,
  "stripe_subscription_id" text UNIQUE,
  "stripe_price_id" text,
  "status" text NOT NULL DEFAULT 'incomplete',
  "current_period_start" timestamp,
  "current_period_end" timestamp,
  "cancel_at_period_end" boolean DEFAULT false,
  "canceled_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "agent_subscription_userId_idx" ON "agent_subscription" ("user_id");
CREATE INDEX IF NOT EXISTS "agent_subscription_agentId_idx" ON "agent_subscription" ("agent_id");
CREATE INDEX IF NOT EXISTS "agent_subscription_stripeSubscriptionId_idx" ON "agent_subscription" ("stripe_subscription_id");
