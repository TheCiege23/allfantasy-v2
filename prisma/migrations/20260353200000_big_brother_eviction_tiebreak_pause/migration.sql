-- PROMPT 5: Big Brother eviction tie-break mode and week progression pause
ALTER TABLE "big_brother_league_configs" ADD COLUMN IF NOT EXISTS "evictionTieBreakMode" VARCHAR(24) NOT NULL DEFAULT 'season_points';
ALTER TABLE "big_brother_league_configs" ADD COLUMN IF NOT EXISTS "weekProgressionPaused" BOOLEAN NOT NULL DEFAULT false;
