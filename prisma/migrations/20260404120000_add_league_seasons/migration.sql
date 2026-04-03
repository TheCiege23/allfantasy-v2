-- CreateTable
CREATE TABLE "league_seasons" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "platformLeagueId" TEXT NOT NULL,
    "championTeamId" TEXT,
    "championName" TEXT,
    "championAvatar" TEXT,
    "runnerUpName" TEXT,
    "regularSeasonWinnerName" TEXT,
    "teamRecords" JSONB,
    "teamCount" INTEGER,
    "scoringFormat" TEXT,
    "isDynasty" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_seasons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "league_seasons_leagueId_season_key" ON "league_seasons"("leagueId", "season");

CREATE INDEX "league_seasons_leagueId_idx" ON "league_seasons"("leagueId");

ALTER TABLE "league_seasons" ADD CONSTRAINT "league_seasons_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "league_seasons" ADD CONSTRAINT "league_seasons_championTeamId_fkey" FOREIGN KEY ("championTeamId") REFERENCES "league_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
