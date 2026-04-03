-- Admin kill-switch: global service on/off flag
-- Run this once against the production database.

CREATE TABLE IF NOT EXISTS "system_config" (
  "id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
  "service_enabled" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
