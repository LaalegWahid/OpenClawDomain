CREATE TABLE IF NOT EXISTS "incoming_message" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() PRIMARY KEY,
  "agent_id" uuid NOT NULL,
  "chat_id" text NOT NULL,
  "source" text NOT NULL,
  "external_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "incoming_message_unique_idx" ON "incoming_message" ("agent_id", "source", "external_id");
CREATE INDEX IF NOT EXISTS "incoming_message_createdAt_idx" ON "incoming_message" ("created_at");
