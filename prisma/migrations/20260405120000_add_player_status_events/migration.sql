-- CreateTable
CREATE TABLE "player_status_events" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "teamAbbrev" TEXT,
    "newStatus" TEXT NOT NULL,
    "previousStatus" TEXT,
    "statusReason" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceRawText" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "gameDate" TIMESTAMP(3),
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autoCoachTriggered" BOOLEAN NOT NULL DEFAULT false,
    "autoCoachTriggeredAt" TIMESTAMP(3),

    CONSTRAINT "player_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_status_events_externalId_detectedAt_idx" ON "player_status_events"("externalId", "detectedAt");

-- CreateIndex
CREATE INDEX "player_status_events_sport_gameDate_idx" ON "player_status_events"("sport", "gameDate");

-- CreateIndex
CREATE INDEX "player_status_events_detectedAt_idx" ON "player_status_events"("detectedAt");

-- CreateIndex
CREATE INDEX "player_status_events_autoCoachTriggered_idx" ON "player_status_events"("autoCoachTriggered");
