CREATE TABLE IF NOT EXISTS "agent_mcp" (
  "id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "agent_id" uuid NOT NULL REFERENCES "agent"("id") ON DELETE CASCADE,
  "server_name" text NOT NULL,
  "transport" text NOT NULL,
  "config" jsonb NOT NULL,
  "enabled" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "agent_mcp_agentId_idx" ON "agent_mcp" ("agent_id");
