-- Canonical contract: queryable preset metadata + versioned `leagues.settings` JSON
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "presetKey" VARCHAR(512);
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "scoringPresetId" VARCHAR(96);
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "settingsSnapshotVersion" INTEGER;

CREATE INDEX IF NOT EXISTS "leagues_scoringPresetId_idx" ON "leagues"("scoringPresetId");
