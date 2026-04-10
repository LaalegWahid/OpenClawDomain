-- Migrate from 3 fixed provider key columns to a single api_provider + api_key pair.
-- This allows any provider (Anthropic, OpenRouter, Gemini, Mistral, Cohere, etc.)

-- 1. Agent table
ALTER TABLE "agent" ADD COLUMN "api_provider" text;
ALTER TABLE "agent" ADD COLUMN "api_key" text;

-- Migrate existing data: pick the first non-null key as the active one
UPDATE "agent"
SET "api_provider" = CASE
      WHEN "anthropic_key"   IS NOT NULL THEN 'anthropic'
      WHEN "openrouter_key"  IS NOT NULL THEN 'openrouter'
      WHEN "gemini_key"      IS NOT NULL THEN 'gemini'
    END,
    "api_key" = COALESCE("anthropic_key", "openrouter_key", "gemini_key")
WHERE "anthropic_key" IS NOT NULL
   OR "openrouter_key" IS NOT NULL
   OR "gemini_key" IS NOT NULL;

ALTER TABLE "agent" DROP COLUMN "anthropic_key";
ALTER TABLE "agent" DROP COLUMN "openrouter_key";
ALTER TABLE "agent" DROP COLUMN "gemini_key";

-- 2. User API keys table
ALTER TABLE "user_api_keys" ADD COLUMN "api_provider" text;
ALTER TABLE "user_api_keys" ADD COLUMN "api_key" text;

UPDATE "user_api_keys"
SET "api_provider" = CASE
      WHEN "anthropic_key"   IS NOT NULL THEN 'anthropic'
      WHEN "openrouter_key"  IS NOT NULL THEN 'openrouter'
      WHEN "gemini_key"      IS NOT NULL THEN 'gemini'
    END,
    "api_key" = COALESCE("anthropic_key", "openrouter_key", "gemini_key")
WHERE "anthropic_key" IS NOT NULL
   OR "openrouter_key" IS NOT NULL
   OR "gemini_key" IS NOT NULL;

ALTER TABLE "user_api_keys" DROP COLUMN "anthropic_key";
ALTER TABLE "user_api_keys" DROP COLUMN "openrouter_key";
ALTER TABLE "user_api_keys" DROP COLUMN "gemini_key";
