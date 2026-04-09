ALTER TABLE "user_api_keys" ADD COLUMN "api_provider" text;--> statement-breakpoint
ALTER TABLE "user_api_keys" ADD COLUMN "api_key" text;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "api_provider" text;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "api_key" text;--> statement-breakpoint
ALTER TABLE "user_api_keys" DROP COLUMN "anthropic_key";--> statement-breakpoint
ALTER TABLE "user_api_keys" DROP COLUMN "openrouter_key";--> statement-breakpoint
ALTER TABLE "user_api_keys" DROP COLUMN "gemini_key";--> statement-breakpoint
ALTER TABLE "agent" DROP COLUMN "anthropic_key";--> statement-breakpoint
ALTER TABLE "agent" DROP COLUMN "openrouter_key";--> statement-breakpoint
ALTER TABLE "agent" DROP COLUMN "gemini_key";