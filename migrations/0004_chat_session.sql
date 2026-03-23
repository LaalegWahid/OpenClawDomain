CREATE TABLE IF NOT EXISTS "chat_session" (
  "id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "agent_id" uuid NOT NULL REFERENCES "agent"("id") ON DELETE CASCADE,
  "chat_id" text NOT NULL,
  "last_response_id" text,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_session_agent_chat_idx" ON "chat_session" USING btree ("agent_id", "chat_id");
