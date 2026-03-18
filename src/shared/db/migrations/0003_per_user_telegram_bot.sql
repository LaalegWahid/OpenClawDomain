-- Remove type column from agent, add bot/prompt columns
ALTER TABLE "agent" DROP COLUMN IF EXISTS "type";--> statement-breakpoint

-- Add columns as nullable first
ALTER TABLE "agent" ADD COLUMN IF NOT EXISTS "bot_token" text;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN IF NOT EXISTS "bot_username" text;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN IF NOT EXISTS "system_prompt" text;--> statement-breakpoint

-- Delete old agents that don't have bot tokens (legacy agents)
DELETE FROM "agent" WHERE "bot_token" IS NULL;--> statement-breakpoint

-- Now make columns NOT NULL
ALTER TABLE "agent" ALTER COLUMN "bot_token" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agent" ALTER COLUMN "bot_username" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agent" ALTER COLUMN "system_prompt" SET NOT NULL;--> statement-breakpoint

-- Add unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "agent_botToken_idx" ON "agent" USING btree ("bot_token");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agent_botUsername_idx" ON "agent" USING btree ("bot_username");--> statement-breakpoint

-- Remove telegram fields from user
ALTER TABLE "user" DROP COLUMN IF EXISTS "telegram_id";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "telegram_username";--> statement-breakpoint

-- Drop telegram_link_token table
DROP TABLE IF EXISTS "telegram_link_token";
