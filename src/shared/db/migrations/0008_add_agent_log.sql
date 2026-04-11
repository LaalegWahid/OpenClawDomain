CREATE TABLE IF NOT EXISTS "agent_log" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() PRIMARY KEY,
  "agent_id" uuid NOT NULL REFERENCES "agent"("id") ON DELETE CASCADE,
  "source" text NOT NULL,
  "status" text NOT NULL DEFAULT 'running',
  "user_prompt" text NOT NULL,
  "assistant_response" text,
  "input_tokens" integer,
  "output_tokens" integer,
  "duration_ms" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp
);

CREATE INDEX IF NOT EXISTS "agent_log_agentId_idx" ON "agent_log" ("agent_id");
CREATE INDEX IF NOT EXISTS "agent_log_createdAt_idx" ON "agent_log" ("created_at");
