CREATE TABLE "domain_config" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"agent_type" text NOT NULL,
	"label" text NOT NULL,
	"boundary_preamble" text NOT NULL,
	"skills" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "domain_config_agent_type_idx" ON "domain_config" USING btree ("agent_type");