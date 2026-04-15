CREATE TABLE IF NOT EXISTS "agent_creation_feedback" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() PRIMARY KEY,
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "agent_id" uuid REFERENCES "agent"("id") ON DELETE SET NULL,
  "rating" integer NOT NULL,
  "comment" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "agent_creation_feedback_userId_idx" ON "agent_creation_feedback" ("user_id");
CREATE INDEX IF NOT EXISTS "agent_creation_feedback_agentId_idx" ON "agent_creation_feedback" ("agent_id");
