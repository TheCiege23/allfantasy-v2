-- D.5-test: AllFantasy AI ADP snapshot table.
-- One row per (playerKey, contextHash, draftMode).
-- contextHash = SHA-256-style string built by lib/adp/computeAllFantasyAdp.ts from
-- (sport, leagueType, draftType, scoringFormat, rosterFormat, teamCount, season).

CREATE TABLE IF NOT EXISTS "allfantasy_adp_snapshots" (
    "id" TEXT NOT NULL,
    "playerKey" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "leagueType" VARCHAR(32) NOT NULL,
    "draftType" VARCHAR(32) NOT NULL,
    "scoringFormat" VARCHAR(32) NOT NULL,
    "rosterFormat" VARCHAR(32) NOT NULL,
    "teamCount" INTEGER NOT NULL,
    "season" VARCHAR(16) NOT NULL,
    "draftMode" VARCHAR(16) NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "averageOverallPick" DOUBLE PRECISION NOT NULL,
    "averageRound" DOUBLE PRECISION NOT NULL,
    "averagePickInRound" DOUBLE PRECISION NOT NULL,
    "minOverallPick" INTEGER NOT NULL,
    "maxOverallPick" INTEGER NOT NULL,
    "sevenDayTrend" DOUBLE PRECISION,
    "thirtyDayTrend" DOUBLE PRECISION,
    "contextHash" VARCHAR(96) NOT NULL,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "allfantasy_adp_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "allfantasy_adp_snapshots_playerKey_contextHash_draftMode_key"
  ON "allfantasy_adp_snapshots"("playerKey", "contextHash", "draftMode");

CREATE INDEX IF NOT EXISTS "allfantasy_adp_snapshots_sport_season_draftMode_idx"
  ON "allfantasy_adp_snapshots"("sport", "season", "draftMode");

CREATE INDEX IF NOT EXISTS "allfantasy_adp_snapshots_contextHash_draftMode_idx"
  ON "allfantasy_adp_snapshots"("contextHash", "draftMode");

CREATE INDEX IF NOT EXISTS "allfantasy_adp_snapshots_playerKey_idx"
  ON "allfantasy_adp_snapshots"("playerKey");
