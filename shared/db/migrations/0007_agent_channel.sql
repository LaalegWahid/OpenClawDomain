CREATE TABLE IF NOT EXISTS "agent_channel" (
  "id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "agent_id" uuid NOT NULL REFERENCES "agent"("id") ON DELETE CASCADE,
  "platform" text NOT NULL,
  "credentials" jsonb NOT NULL,
  "enabled" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "agent_channel_agentId_idx" ON "agent_channel" ("agent_id");
