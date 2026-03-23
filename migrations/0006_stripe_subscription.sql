CREATE TABLE IF NOT EXISTS "subscription" (
  "id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
  "stripe_subscription_id" text UNIQUE,
  "stripe_price_id" text,
  "status" text DEFAULT 'incomplete' NOT NULL,
  "current_period_start" timestamp,
  "current_period_end" timestamp,
  "cancel_at_period_end" boolean DEFAULT false,
  "canceled_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_method" (
  "id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "stripe_payment_method_id" text NOT NULL UNIQUE,
  "brand" text,
  "last4" text,
  "exp_month" integer,
  "exp_year" integer,
  "is_default" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscription_userId_idx" ON "subscription" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscription_stripeSubscriptionId_idx" ON "subscription" USING btree ("stripe_subscription_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "paymentMethod_userId_idx" ON "payment_method" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "paymentMethod_stripePaymentMethodId_idx" ON "payment_method" USING btree ("stripe_payment_method_id");
