CREATE TABLE IF NOT EXISTS "skill_api_key" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() PRIMARY KEY,
  "user_id" uuid NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
  "api_provider" text NOT NULL,
  "api_key" text NOT NULL,
  "agent_model" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "skill_api_key_userId_idx" ON "skill_api_key" ("user_id");
