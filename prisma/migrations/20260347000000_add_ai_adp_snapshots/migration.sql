-- CreateTable
CREATE TABLE "ai_adp_snapshots" (
    "id" TEXT NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "leagueType" VARCHAR(16) NOT NULL,
    "formatKey" VARCHAR(32) NOT NULL,
    "snapshotData" JSONB NOT NULL DEFAULT '[]',
    "totalDrafts" INTEGER NOT NULL DEFAULT 0,
    "totalPicks" INTEGER NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "ai_adp_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_adp_snapshots_sport_leagueType_formatKey_key" ON "ai_adp_snapshots"("sport", "leagueType", "formatKey");

-- CreateIndex
CREATE INDEX "ai_adp_snapshots_sport_idx" ON "ai_adp_snapshots"("sport");

-- CreateIndex
CREATE INDEX "ai_adp_snapshots_computedAt_idx" ON "ai_adp_snapshots"("computedAt");
