-- AlterTable: MockDraft optional leagueId and add metadata
-- Run manually if prisma migrate dev fails (e.g. shadow DB issues).

ALTER TABLE "mock_drafts" ALTER COLUMN "league_id" DROP NOT NULL;

ALTER TABLE "mock_drafts" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
