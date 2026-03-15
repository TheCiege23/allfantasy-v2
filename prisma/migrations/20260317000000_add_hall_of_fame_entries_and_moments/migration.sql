-- CreateTable
CREATE TABLE "hall_of_fame_entries" (
    "id" TEXT NOT NULL,
    "entityType" VARCHAR(32) NOT NULL,
    "entityId" VARCHAR(128) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "leagueId" VARCHAR(64),
    "season" VARCHAR(16),
    "category" VARCHAR(64) NOT NULL,
    "title" VARCHAR(256) NOT NULL,
    "summary" TEXT,
    "inductedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DECIMAL(10,4) NOT NULL,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "hall_of_fame_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hall_of_fame_moments" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "season" VARCHAR(16) NOT NULL,
    "headline" VARCHAR(512) NOT NULL,
    "summary" TEXT,
    "relatedManagerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relatedTeamIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relatedMatchupId" VARCHAR(64),
    "significanceScore" DECIMAL(10,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hall_of_fame_moments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hall_of_fame_entries_sport_category_idx" ON "hall_of_fame_entries"("sport", "category");

-- CreateIndex
CREATE INDEX "hall_of_fame_entries_leagueId_entityType_idx" ON "hall_of_fame_entries"("leagueId", "entityType");

-- CreateIndex
CREATE INDEX "hall_of_fame_entries_entityType_entityId_idx" ON "hall_of_fame_entries"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "hall_of_fame_entries_inductedAt_idx" ON "hall_of_fame_entries"("inductedAt");

-- CreateIndex
CREATE INDEX "hall_of_fame_moments_leagueId_season_idx" ON "hall_of_fame_moments"("leagueId", "season");

-- CreateIndex
CREATE INDEX "hall_of_fame_moments_sport_season_idx" ON "hall_of_fame_moments"("sport", "season");

-- CreateIndex
CREATE INDEX "hall_of_fame_moments_createdAt_idx" ON "hall_of_fame_moments"("createdAt");
