CREATE TABLE IF NOT EXISTS "whatsapp_link_session" (
  "id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "agent_id" uuid NOT NULL REFERENCES "agent"("id") ON DELETE CASCADE,
  "task_arn" text,
  "status" text NOT NULL DEFAULT 'pending',
  "qr_data" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "whatsapp_link_agentId_idx" ON "whatsapp_link_session" ("agent_id");
