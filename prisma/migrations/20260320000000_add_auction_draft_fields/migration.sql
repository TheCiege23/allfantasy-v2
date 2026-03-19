-- Add auction draft fields to DraftSession and DraftPick (PROMPT 188).
-- Run conditionally so this migration can apply before draft_sessions exists (20260345 creates it).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'draft_sessions') THEN
    ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "auctionBudgetPerTeam" INTEGER;
    ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "auctionBudgets" JSONB;
    ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "auctionState" JSONB;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'draft_picks') THEN
    ALTER TABLE "draft_picks" ADD COLUMN IF NOT EXISTS "amount" INTEGER;
  END IF;
END $$;
