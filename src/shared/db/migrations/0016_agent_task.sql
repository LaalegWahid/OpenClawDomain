CREATE TABLE IF NOT EXISTS "agent_task" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() PRIMARY KEY,
  "agent_id" uuid NOT NULL REFERENCES "agent"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "prompt" text NOT NULL,
  "cron_expr" text NOT NULL,
  "timezone" text DEFAULT 'UTC' NOT NULL,
  "session_mode" text DEFAULT 'isolated' NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "agent_task_agentId_idx" ON "agent_task" ("agent_id");
CREATE INDEX IF NOT EXISTS "agent_task_userId_idx" ON "agent_task" ("user_id");
