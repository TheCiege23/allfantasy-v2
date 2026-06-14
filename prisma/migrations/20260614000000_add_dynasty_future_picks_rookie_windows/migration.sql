-- Dynasty pick capital: future_draft_picks + rookie_draft_windows.
--
-- These two models were added to schema.prisma (commit 2474e04f, "Phase 7B-7E")
-- but no migration was ever generated, so the live database lacks the tables
-- (Prisma raises P2021 at runtime). This migration creates ONLY those two tables
-- plus their two backing enums and indexes.
--
-- SAFETY (read docs/dynasty-pick-capital-audit.md):
--  * Purely ADDITIVE — creates new objects only. No existing table gains/loses a
--    column, and the only foreign keys point FROM these new tables INTO the
--    existing "leagues" table. Existing production data is untouched.
--  * IDEMPOTENT — every statement is guarded (CREATE TYPE in a DO/EXCEPTION block,
--    CREATE TABLE/INDEX IF NOT EXISTS, FK added only when absent). Safe to re-run.
--  * The live Neon database has drifted from schema.prisma in unrelated ways, so a
--    full `prisma migrate dev` / `db push` would emit destructive DROPs. This file
--    was therefore hand-authored and applied scoped via `prisma db execute`, then
--    recorded with `prisma migrate resolve --applied`. Do NOT regenerate via
--    `migrate dev` against the production datasource.

-- CreateEnum: future_draft_pick_status
DO $$ BEGIN
  CREATE TYPE "future_draft_pick_status" AS ENUM ('active', 'traded', 'forfeited', 'used');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: rookie_draft_window_status
DO $$ BEGIN
  CREATE TYPE "rookie_draft_window_status" AS ENUM ('pending', 'open', 'ready', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable: future_draft_picks
CREATE TABLE IF NOT EXISTS "future_draft_picks" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "pickSeason" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "originalRosterId" VARCHAR(64) NOT NULL,
    "currentOwnerId" VARCHAR(64) NOT NULL,
    "status" "future_draft_pick_status" NOT NULL DEFAULT 'active',
    "traded" BOOLEAN NOT NULL DEFAULT false,
    "sourceTradeId" VARCHAR(64),
    "tradedAt" TIMESTAMP(3),
    "usedInDraftSessionId" VARCHAR(64),
    "usedAt" TIMESTAMP(3),
    "forfeitedAt" TIMESTAMP(3),
    "forfeitReason" VARCHAR(128),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "future_draft_picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: rookie_draft_windows
CREATE TABLE IF NOT EXISTS "rookie_draft_windows" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "season" INTEGER NOT NULL,
    "status" "rookie_draft_window_status" NOT NULL DEFAULT 'pending',
    "draftOrderMethod" VARCHAR(32) NOT NULL,
    "pickOrderSnapshot" JSONB,
    "scheduledDraftDate" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "initiatedBy" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rookie_draft_windows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "future_draft_picks_leagueId_pickSeason_idx" ON "future_draft_picks"("leagueId", "pickSeason");
CREATE INDEX IF NOT EXISTS "future_draft_picks_currentOwnerId_pickSeason_idx" ON "future_draft_picks"("currentOwnerId", "pickSeason");
CREATE INDEX IF NOT EXISTS "future_draft_picks_leagueId_status_idx" ON "future_draft_picks"("leagueId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "future_draft_picks_leagueId_pickSeason_round_originalRoster_key" ON "future_draft_picks"("leagueId", "pickSeason", "round", "originalRosterId");
CREATE INDEX IF NOT EXISTS "rookie_draft_windows_leagueId_status_idx" ON "rookie_draft_windows"("leagueId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "rookie_draft_windows_leagueId_season_key" ON "rookie_draft_windows"("leagueId", "season");

-- AddForeignKey (guarded so re-runs do not error)
DO $$ BEGIN
  ALTER TABLE "future_draft_picks"
    ADD CONSTRAINT "future_draft_picks_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "rookie_draft_windows"
    ADD CONSTRAINT "rookie_draft_windows_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
