-- AlterTable: durable snapshot of automation flags captured when the
-- commissioner pauses the season, so resume_season can restore them
-- regardless of unrelated writes to lastError.
ALTER TABLE "survivor_game_states" ADD COLUMN IF NOT EXISTS "pausedSnapshot" JSONB;
