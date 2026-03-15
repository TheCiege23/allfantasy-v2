-- CreateTable
CREATE TABLE "manager_franchise_profiles" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "totalCareerSeasons" INTEGER NOT NULL DEFAULT 0,
    "totalLeaguesPlayed" INTEGER NOT NULL DEFAULT 0,
    "championshipCount" INTEGER NOT NULL DEFAULT 0,
    "playoffAppearances" INTEGER NOT NULL DEFAULT 0,
    "careerWinPercentage" DECIMAL(6,4) NOT NULL,
    "gmPrestigeScore" DECIMAL(10,4) NOT NULL,
    "franchiseValue" DECIMAL(12,4) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_franchise_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gm_progression_events" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "valueChange" DECIMAL(12,4) NOT NULL,
    "sourceReference" VARCHAR(256),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gm_progression_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manager_franchise_profiles_managerId_key" ON "manager_franchise_profiles"("managerId");

-- CreateIndex
CREATE INDEX "manager_franchise_profiles_gmPrestigeScore_idx" ON "manager_franchise_profiles"("gmPrestigeScore");

-- CreateIndex
CREATE INDEX "manager_franchise_profiles_franchiseValue_idx" ON "manager_franchise_profiles"("franchiseValue");

-- CreateIndex
CREATE INDEX "gm_progression_events_managerId_idx" ON "gm_progression_events"("managerId");

-- CreateIndex
CREATE INDEX "gm_progression_events_managerId_sport_idx" ON "gm_progression_events"("managerId", "sport");

-- CreateIndex
CREATE INDEX "gm_progression_events_eventType_createdAt_idx" ON "gm_progression_events"("eventType", "createdAt");
