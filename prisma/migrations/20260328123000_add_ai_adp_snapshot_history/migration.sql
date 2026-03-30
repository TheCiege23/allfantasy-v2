-- CreateTable
CREATE TABLE "ai_adp_snapshot_history" (
    "id" TEXT NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "leagueType" VARCHAR(16) NOT NULL,
    "formatKey" VARCHAR(32) NOT NULL,
    "snapshotData" JSONB NOT NULL DEFAULT '[]',
    "totalDrafts" INTEGER NOT NULL DEFAULT 0,
    "totalPicks" INTEGER NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runMeta" JSONB,

    CONSTRAINT "ai_adp_snapshot_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_adp_snapshot_history_sport_leagueType_formatKey_computedAt_idx"
ON "ai_adp_snapshot_history"("sport", "leagueType", "formatKey", "computedAt" DESC);

-- CreateIndex
CREATE INDEX "ai_adp_snapshot_history_computedAt_idx"
ON "ai_adp_snapshot_history"("computedAt" DESC);
