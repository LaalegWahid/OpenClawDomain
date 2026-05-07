ALTER TABLE "agent" ALTER COLUMN "bot_token" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agent" ALTER COLUMN "bot_username" DROP NOT NULL;--> statement-breakpoint
DROP INDEX IF EXISTS "agent_botToken_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "agent_botUsername_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "agent_botToken_idx" ON "agent" USING btree ("bot_token") WHERE "bot_token" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_botUsername_idx" ON "agent" USING btree ("bot_username") WHERE "bot_username" IS NOT NULL;
