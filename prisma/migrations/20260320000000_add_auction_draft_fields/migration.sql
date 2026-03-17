-- Add auction draft fields to DraftSession and DraftPick (PROMPT 188).

ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "auctionBudgetPerTeam" INTEGER;
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "auctionBudgets" JSONB;
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "auctionState" JSONB;

ALTER TABLE "draft_picks" ADD COLUMN IF NOT EXISTS "amount" INTEGER;
