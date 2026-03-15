-- CreateTable
CREATE TABLE "award_records" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "season" VARCHAR(16) NOT NULL,
    "awardType" VARCHAR(64) NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "score" DECIMAL(12,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "award_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "award_records_leagueId_season_idx" ON "award_records"("leagueId", "season");

-- CreateIndex
CREATE INDEX "award_records_leagueId_season_awardType_idx" ON "award_records"("leagueId", "season", "awardType");

-- CreateIndex
CREATE INDEX "award_records_managerId_idx" ON "award_records"("managerId");
