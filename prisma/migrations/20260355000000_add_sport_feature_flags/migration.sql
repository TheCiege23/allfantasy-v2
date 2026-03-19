-- CreateTable
CREATE TABLE "sport_feature_flags" (
    "id" TEXT NOT NULL,
    "sportType" VARCHAR(12) NOT NULL,
    "supportsBestBall" BOOLEAN NOT NULL DEFAULT false,
    "supportsSuperflex" BOOLEAN NOT NULL DEFAULT false,
    "supportsTePremium" BOOLEAN NOT NULL DEFAULT false,
    "supportsKickers" BOOLEAN NOT NULL DEFAULT false,
    "supportsTeamDefense" BOOLEAN NOT NULL DEFAULT false,
    "supportsIdp" BOOLEAN NOT NULL DEFAULT false,
    "supportsWeeklyLineups" BOOLEAN NOT NULL DEFAULT true,
    "supportsDailyLineups" BOOLEAN NOT NULL DEFAULT false,
    "supportsBracketMode" BOOLEAN NOT NULL DEFAULT false,
    "supportsDevy" BOOLEAN NOT NULL DEFAULT false,
    "supportsTaxi" BOOLEAN NOT NULL DEFAULT false,
    "supportsIr" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sport_feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sport_feature_flags_sportType_key" ON "sport_feature_flags"("sportType");
