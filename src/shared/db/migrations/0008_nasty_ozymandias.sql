CREATE TABLE "agent_log" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"user_prompt" text NOT NULL,
	"assistant_response" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "profile_image" text;--> statement-breakpoint
ALTER TABLE "agent_log" ADD CONSTRAINT "agent_log_agent_id_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_log_agentId_idx" ON "agent_log" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_log_createdAt_idx" ON "agent_log" USING btree ("created_at");