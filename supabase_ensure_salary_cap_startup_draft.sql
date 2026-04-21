-- Migration: normalize salary cap startup/future draft types
-- Removes 'linear' as a valid draft type (never supported in salary cap leagues)
-- and ensures DB defaults align with code defaults.

-- 1. Normalize any existing 'linear' futureDraftType rows to 'snake'
UPDATE "salary_cap_league_configs"
SET "futureDraftType" = 'snake'
WHERE "futureDraftType" = 'linear';

-- 2. Normalize any 'snake_salary' or 'hybrid' startupDraftType rows to 'snake'
UPDATE "salary_cap_league_configs"
SET "startupDraftType" = 'snake'
WHERE "startupDraftType" IN ('snake_salary', 'hybrid');

-- 3. Update the column default from 'linear' to 'snake' for future rows
ALTER TABLE "salary_cap_league_configs"
  ALTER COLUMN "futureDraftType" SET DEFAULT 'snake';
