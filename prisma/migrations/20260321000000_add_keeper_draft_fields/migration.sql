-- Add keeper draft fields to DraftSession (PROMPT 190).
-- Run conditionally: draft_sessions is created in 20260345000000_add_live_draft_engine.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'draft_sessions') THEN
    ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "keeperConfig" JSONB;
    ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "keeperSelections" JSONB;
  END IF;
END $$;
