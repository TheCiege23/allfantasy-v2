-- Draft session audit + pick asset typing (canonical draft engine)

ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "pausedByUserId" TEXT;
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "draftModeLabel" VARCHAR(32);

ALTER TABLE "draft_picks" ADD COLUMN IF NOT EXISTS "originalRosterId" TEXT;
ALTER TABLE "draft_picks" ADD COLUMN IF NOT EXISTS "assetType" VARCHAR(24) DEFAULT 'player';
ALTER TABLE "draft_picks" ADD COLUMN IF NOT EXISTS "pickMetadata" JSONB;
