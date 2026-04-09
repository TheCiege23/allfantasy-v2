-- =============================================================================
-- supabase_ensure_idol_enhancements.sql
-- Adds missing columns to survivor_idols for enhanced idol system.
-- Idols are now player-bound, unique per type, transferable on trade/waiver.
-- =============================================================================

-- Idol metadata columns
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "powerLabel" TEXT;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "powerDesc" TEXT;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "powerCategory" TEXT;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "currentOwnerUserId" TEXT;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "originalOwnerUserId" TEXT;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "isSecret" BOOLEAN DEFAULT true;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "isPubliclyKnown" BOOLEAN DEFAULT false;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "isTradable" BOOLEAN DEFAULT true;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "transferHistory" JSONB DEFAULT '[]';
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "playWindowRule" TEXT;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "rarity" TEXT;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "expiresAtMerge" BOOLEAN DEFAULT true;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "expiresAtWeek" INTEGER;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "usedAtCouncilId" TEXT;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "isUsed" BOOLEAN DEFAULT false;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMPTZ;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "usedAt" TIMESTAMPTZ;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "expiredAt" TIMESTAMPTZ;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "validUntilPhase" TEXT;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "auditLog" JSONB DEFAULT '[]';

-- Indexes for idol lookup
CREATE INDEX IF NOT EXISTS "survivor_idols_playerId_idx" ON "survivor_idols" ("playerId");
CREATE INDEX IF NOT EXISTS "survivor_idols_currentOwnerUserId_idx" ON "survivor_idols" ("currentOwnerUserId");
CREATE INDEX IF NOT EXISTS "survivor_idols_powerCategory_idx" ON "survivor_idols" ("powerCategory");

-- Idol ledger entry: add metadata column if missing
ALTER TABLE "survivor_idol_ledger_entries" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
