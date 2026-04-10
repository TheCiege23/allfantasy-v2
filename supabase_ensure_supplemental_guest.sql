-- =============================================================================
-- supabase_ensure_supplemental_guest.sql
-- Supplemental draft + guest session tables. Safe to re-run.
-- =============================================================================

-- Supplemental draft configurations
CREATE TABLE IF NOT EXISTS "supplemental_draft_configs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "draftSessionId" TEXT,
  "draftType" TEXT DEFAULT 'snake',
  "rounds" INTEGER DEFAULT 5,
  "timerSeconds" INTEGER DEFAULT 120,
  "orphanTeamIds" TEXT[] DEFAULT '{}',
  "includeOrphanRosters" BOOLEAN DEFAULT true,
  "includeFreeAgents" BOOLEAN DEFAULT true,
  "includeUndraftedRookies" BOOLEAN DEFAULT true,
  "includeUndraftedDevy" BOOLEAN DEFAULT false,
  "status" TEXT DEFAULT 'configuring',
  "createdBy" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplemental_draft_configs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "supplemental_draft_configs_league_idx"
  ON "supplemental_draft_configs" ("leagueId");

-- Guest session analytics (server-side tracking for engagement metrics)
CREATE TABLE IF NOT EXISTS "guest_session_analytics" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "guestId" TEXT NOT NULL,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "pagesViewed" TEXT[] DEFAULT '{}',
  "mockDraftsJoined" INTEGER DEFAULT 0,
  "tradeAnalyzesUsed" INTEGER DEFAULT 0,
  "chimmyQueriesUsed" INTEGER DEFAULT 0,
  "convertedToUser" BOOLEAN DEFAULT false,
  "convertedUserId" TEXT,
  "convertedAt" TIMESTAMPTZ,
  "firstSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guest_session_analytics_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "guest_session_analytics_guest_idx"
  ON "guest_session_analytics" ("guestId");
CREATE INDEX IF NOT EXISTS "guest_session_analytics_converted_idx"
  ON "guest_session_analytics" ("convertedToUser");

-- Add supplemental draft flag to draft_sessions if not present
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "isSupplemental" BOOLEAN DEFAULT false;
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "supplementalConfigId" TEXT;
