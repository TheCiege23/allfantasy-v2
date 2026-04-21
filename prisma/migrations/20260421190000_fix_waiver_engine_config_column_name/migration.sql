-- Fix column name mismatch introduced by prior migration:
-- Prisma model expects quoted camelCase "waiverEngineConfig", but the
-- previous migration added snake_case "waiver_engine_config".
ALTER TABLE "league_waiver_settings"
ADD COLUMN IF NOT EXISTS "waiverEngineConfig" JSONB;

-- Backfill from snake_case if rows were written before this fix.
UPDATE "league_waiver_settings"
SET "waiverEngineConfig" = "waiver_engine_config"
WHERE "waiverEngineConfig" IS NULL
  AND "waiver_engine_config" IS NOT NULL;
