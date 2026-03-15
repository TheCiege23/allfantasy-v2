-- CreateTable
CREATE TABLE "rivalry_records" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "managerAId" VARCHAR(128) NOT NULL,
    "managerBId" VARCHAR(128) NOT NULL,
    "rivalryScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rivalryTier" VARCHAR(32) NOT NULL,
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rivalry_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rivalry_events" (
    "id" TEXT NOT NULL,
    "rivalryId" TEXT NOT NULL,
    "eventType" VARCHAR(48) NOT NULL,
    "season" INTEGER,
    "matchupId" VARCHAR(64),
    "tradeId" VARCHAR(64),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rivalry_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rivalry_records_leagueId_sport_idx" ON "rivalry_records"("leagueId", "sport");

-- CreateIndex
CREATE INDEX "rivalry_records_leagueId_rivalryTier_idx" ON "rivalry_records"("leagueId", "rivalryTier");

-- CreateIndex
CREATE INDEX "rivalry_records_managerAId_managerBId_idx" ON "rivalry_records"("managerAId", "managerBId");

-- CreateIndex
CREATE UNIQUE INDEX "rivalry_records_leagueId_managerAId_managerBId_key" ON "rivalry_records"("leagueId", "managerAId", "managerBId");

-- CreateIndex
CREATE INDEX "rivalry_events_rivalryId_idx" ON "rivalry_events"("rivalryId");

-- CreateIndex
CREATE INDEX "rivalry_events_eventType_season_idx" ON "rivalry_events"("eventType", "season");

-- AddForeignKey
ALTER TABLE "rivalry_events" ADD CONSTRAINT "rivalry_events_rivalryId_fkey" FOREIGN KEY ("rivalryId") REFERENCES "rivalry_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
