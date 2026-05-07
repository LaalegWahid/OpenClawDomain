CREATE TABLE "agent_task" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"prompt" text NOT NULL,
	"cron_expr" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"session_mode" text DEFAULT 'isolated' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incoming_message" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"chat_id" text NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_model" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_task" ADD CONSTRAINT "agent_task_agent_id_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_task" ADD CONSTRAINT "agent_task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_task_agentId_idx" ON "agent_task" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_task_userId_idx" ON "agent_task" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "incoming_message_unique_idx" ON "incoming_message" USING btree ("agent_id","source","external_id");--> statement-breakpoint
CREATE INDEX "incoming_message_createdAt_idx" ON "incoming_message" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_model_provider_name_idx" ON "ai_model" USING btree ("provider","name");--> statement-breakpoint
CREATE INDEX "ai_model_provider_idx" ON "ai_model" USING btree ("provider");