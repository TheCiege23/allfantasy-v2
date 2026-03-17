-- Add keeper draft fields to DraftSession (PROMPT 190).

ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "keeperConfig" JSONB;
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "keeperSelections" JSONB;
