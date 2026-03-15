-- CreateTable
CREATE TABLE "sim_matchup_results" (
    "simulationId" TEXT NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "leagueId" VARCHAR(64),
    "weekOrPeriod" INTEGER NOT NULL,
    "teamAId" VARCHAR(64),
    "teamBId" VARCHAR(64),
    "expectedScoreA" DOUBLE PRECISION NOT NULL,
    "expectedScoreB" DOUBLE PRECISION NOT NULL,
    "winProbabilityA" DOUBLE PRECISION NOT NULL,
    "winProbabilityB" DOUBLE PRECISION NOT NULL,
    "score_distribution_a" JSONB,
    "score_distribution_b" JSONB,
    "iterations" INTEGER NOT NULL DEFAULT 2000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sim_matchup_results_pkey" PRIMARY KEY ("simulationId")
);

-- CreateTable
CREATE TABLE "sim_season_results" (
    "resultId" TEXT NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "teamId" VARCHAR(64) NOT NULL,
    "season" INTEGER NOT NULL,
    "weekOrPeriod" INTEGER NOT NULL,
    "playoffProbability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "championshipProbability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedWins" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedRank" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "simulationsRun" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sim_season_results_pkey" PRIMARY KEY ("resultId")
);

-- CreateIndex
CREATE INDEX "sim_matchup_results_leagueId_weekOrPeriod_idx" ON "sim_matchup_results"("leagueId", "weekOrPeriod");

-- CreateIndex
CREATE INDEX "sim_matchup_results_sport_idx" ON "sim_matchup_results"("sport");

-- CreateIndex
CREATE INDEX "sim_season_results_leagueId_season_weekOrPeriod_idx" ON "sim_season_results"("leagueId", "season", "weekOrPeriod");

-- CreateIndex
CREATE INDEX "sim_season_results_teamId_idx" ON "sim_season_results"("teamId");

-- CreateIndex
CREATE INDEX "sim_season_results_sport_idx" ON "sim_season_results"("sport");
