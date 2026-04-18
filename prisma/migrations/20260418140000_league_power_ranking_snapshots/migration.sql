-- Cached power ranking snapshots per league/week/mode (trends, history, widgets)

CREATE TABLE "league_power_ranking_snapshots" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "rankingMode" VARCHAR(32) NOT NULL DEFAULT 'current_power',
    "engine" VARCHAR(32) NOT NULL,
    "teams" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_power_ranking_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uniq_league_power_rank_snapshot_league_season_week_mode"
  ON "league_power_ranking_snapshots"("leagueId", "season", "week", "rankingMode");

CREATE INDEX "league_power_ranking_snapshots_leagueId_computedAt_idx"
  ON "league_power_ranking_snapshots"("leagueId", "computedAt");

ALTER TABLE "league_power_ranking_snapshots"
  ADD CONSTRAINT "league_power_ranking_snapshots_leagueId_fkey"
  FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
