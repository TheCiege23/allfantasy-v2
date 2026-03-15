-- CreateTable
CREATE TABLE "manager_xp_profiles" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "currentTier" VARCHAR(32) NOT NULL,
    "xpToNextTier" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_xp_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_events" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "xpValue" INTEGER NOT NULL DEFAULT 0,
    "sport" VARCHAR(16) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manager_xp_profiles_managerId_key" ON "manager_xp_profiles"("managerId");

-- CreateIndex
CREATE INDEX "manager_xp_profiles_totalXP_idx" ON "manager_xp_profiles"("totalXP");

-- CreateIndex
CREATE INDEX "manager_xp_profiles_currentTier_idx" ON "manager_xp_profiles"("currentTier");

-- CreateIndex
CREATE INDEX "xp_events_managerId_idx" ON "xp_events"("managerId");

-- CreateIndex
CREATE INDEX "xp_events_managerId_sport_idx" ON "xp_events"("managerId", "sport");

-- CreateIndex
CREATE INDEX "xp_events_eventType_createdAt_idx" ON "xp_events"("eventType", "createdAt");
