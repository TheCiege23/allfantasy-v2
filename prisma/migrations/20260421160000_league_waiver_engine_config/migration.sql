-- Extended JSON column for production waiver/FAAB rules (min bid, custom schedules, drop policies, etc.)
ALTER TABLE "league_waiver_settings" ADD COLUMN IF NOT EXISTS "waiver_engine_config" JSONB;
