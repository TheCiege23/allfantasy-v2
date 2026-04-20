-- Max pending claims per roster for next waiver batch
ALTER TABLE "league_waiver_settings" ADD COLUMN IF NOT EXISTS "claimLimitPerRun" INTEGER;
