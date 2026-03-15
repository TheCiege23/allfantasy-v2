-- CreateTable
CREATE TABLE "drama_events" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "season" INTEGER,
    "dramaType" VARCHAR(48) NOT NULL,
    "headline" VARCHAR(256) NOT NULL,
    "summary" TEXT,
    "relatedManagerIds" JSONB NOT NULL DEFAULT '[]',
    "relatedTeamIds" JSONB NOT NULL DEFAULT '[]',
    "relatedMatchupId" VARCHAR(64),
    "dramaScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drama_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drama_timeline_records" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "season" INTEGER,
    "eventIds" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drama_timeline_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "drama_events_leagueId_sport_idx" ON "drama_events"("leagueId", "sport");

-- CreateIndex
CREATE INDEX "drama_events_leagueId_season_idx" ON "drama_events"("leagueId", "season");

-- CreateIndex
CREATE INDEX "drama_events_dramaType_season_idx" ON "drama_events"("dramaType", "season");

-- CreateIndex
CREATE INDEX "drama_timeline_records_leagueId_idx" ON "drama_timeline_records"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "drama_timeline_records_leagueId_sport_season_key" ON "drama_timeline_records"("leagueId", "sport", "season");
