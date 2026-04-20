-- AF-native weekly scoring, H2H results, season standings
CREATE TABLE IF NOT EXISTS "weekly_scores" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "rosterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "isStarter" BOOLEAN NOT NULL DEFAULT true,
    "statLine" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "weekly_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "weekly_scores_leagueId_season_week_rosterId_playerId_key" ON "weekly_scores"("leagueId", "season", "week", "rosterId", "playerId");
CREATE INDEX IF NOT EXISTS "weekly_scores_leagueId_season_week_idx" ON "weekly_scores"("leagueId", "season", "week");
CREATE INDEX IF NOT EXISTS "weekly_scores_rosterId_season_week_idx" ON "weekly_scores"("rosterId", "season", "week");

ALTER TABLE "weekly_scores" ADD CONSTRAINT "weekly_scores_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "weekly_scores" ADD CONSTRAINT "weekly_scores_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "team_week_results" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "rosterId" TEXT NOT NULL,
    "totalPoints" DOUBLE PRECISION NOT NULL,
    "opponentRosterId" TEXT,
    "winLoss" VARCHAR(8),
    "status" VARCHAR(16) NOT NULL DEFAULT 'final',
    CONSTRAINT "team_week_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "team_week_results_leagueId_season_week_rosterId_key" ON "team_week_results"("leagueId", "season", "week", "rosterId");
CREATE INDEX IF NOT EXISTS "team_week_results_leagueId_season_week_idx" ON "team_week_results"("leagueId", "season", "week");

ALTER TABLE "team_week_results" ADD CONSTRAINT "team_week_results_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_week_results" ADD CONSTRAINT "team_week_results_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "standings" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "rosterId" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsAgainst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "playoffSeed" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "standings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "standings_leagueId_season_rosterId_key" ON "standings"("leagueId", "season", "rosterId");
CREATE INDEX IF NOT EXISTS "standings_leagueId_season_rank_idx" ON "standings"("leagueId", "season", "rank");

ALTER TABLE "standings" ADD CONSTRAINT "standings_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "standings" ADD CONSTRAINT "standings_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
