-- CreateTable
CREATE TABLE "global_meta_snapshots" (
    "id" TEXT NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "season" VARCHAR(8) NOT NULL,
    "weekOrPeriod" INTEGER NOT NULL DEFAULT 0,
    "metaType" VARCHAR(24) NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "global_meta_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position_meta_trends" (
    "id" TEXT NOT NULL,
    "position" VARCHAR(16) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "usageRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "draftRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rosterRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trendingDirection" VARCHAR(16) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "position_meta_trends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "global_meta_snapshots_sport_season_weekOrPeriod_idx" ON "global_meta_snapshots"("sport", "season", "weekOrPeriod");

-- CreateIndex
CREATE INDEX "global_meta_snapshots_metaType_sport_idx" ON "global_meta_snapshots"("metaType", "sport");

-- CreateIndex
CREATE INDEX "global_meta_snapshots_createdAt_idx" ON "global_meta_snapshots"("createdAt");

-- CreateIndex
CREATE INDEX "position_meta_trends_sport_idx" ON "position_meta_trends"("sport");

-- CreateIndex
CREATE INDEX "position_meta_trends_trendingDirection_idx" ON "position_meta_trends"("trendingDirection");

-- CreateIndex
CREATE UNIQUE INDEX "position_meta_trends_position_sport_key" ON "position_meta_trends"("position", "sport");
