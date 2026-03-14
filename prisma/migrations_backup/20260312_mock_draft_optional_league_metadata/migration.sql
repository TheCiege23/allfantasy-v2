-- AlterTable: MockDraft optional leagueId and add metadata
-- Ensures mock_drafts exists in shadow DB (may already exist in production from initial setup).

CREATE TABLE IF NOT EXISTS "mock_drafts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "shareId" TEXT,
  "leagueId" TEXT,
  "userId" UUID NOT NULL,
  "rounds" INTEGER NOT NULL DEFAULT 15,
  "results" JSONB NOT NULL,
  "proposals" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mock_drafts_shareId_key" UNIQUE ("shareId"),
  CONSTRAINT "mock_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "mock_drafts_leagueId_idx" ON "mock_drafts"("leagueId");
CREATE INDEX IF NOT EXISTS "mock_drafts_userId_idx" ON "mock_drafts"("userId");

-- Make leagueId optional and ensure metadata exists (no-op if table already had these)
ALTER TABLE "mock_drafts" ALTER COLUMN "leagueId" DROP NOT NULL;

ALTER TABLE "mock_drafts" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
