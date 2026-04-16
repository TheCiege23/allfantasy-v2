-- Survivor premium engine spec (confessionals, minigame pool, exile variants, presets)
ALTER TABLE "survivor_league_configs" ADD COLUMN IF NOT EXISTS "engineSpecV2" JSONB;
