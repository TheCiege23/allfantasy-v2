-- CreateTable
CREATE TABLE "commentary_entries" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "eventType" VARCHAR(32) NOT NULL,
    "headline" VARCHAR(256) NOT NULL,
    "body" TEXT NOT NULL,
    "contextSnap" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commentary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commentary_entries_leagueId_idx" ON "commentary_entries"("leagueId");

-- CreateIndex
CREATE INDEX "commentary_entries_leagueId_eventType_idx" ON "commentary_entries"("leagueId", "eventType");

-- CreateIndex
CREATE INDEX "commentary_entries_createdAt_idx" ON "commentary_entries"("createdAt");
