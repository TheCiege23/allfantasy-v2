-- CreateTable
CREATE TABLE "dynasty_projections" (
    "projectionId" TEXT NOT NULL,
    "teamId" VARCHAR(64) NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "championshipWindowScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rebuildProbability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rosterStrength3Year" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rosterStrength5Year" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "agingRiskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "futureAssetScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "season" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dynasty_projections_pkey" PRIMARY KEY ("projectionId")
);

-- CreateIndex
CREATE INDEX "dynasty_projections_leagueId_idx" ON "dynasty_projections"("leagueId");

-- CreateIndex
CREATE INDEX "dynasty_projections_teamId_idx" ON "dynasty_projections"("teamId");

-- CreateIndex
CREATE INDEX "dynasty_projections_sport_idx" ON "dynasty_projections"("sport");

-- CreateIndex
CREATE UNIQUE INDEX "dynasty_projections_leagueId_teamId_key" ON "dynasty_projections"("leagueId", "teamId");
