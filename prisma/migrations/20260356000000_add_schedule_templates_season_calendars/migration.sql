-- CreateTable
CREATE TABLE "schedule_templates" (
    "id" TEXT NOT NULL,
    "sportType" VARCHAR(12) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "formatType" VARCHAR(32) NOT NULL,
    "matchupType" VARCHAR(48) NOT NULL,
    "regularSeasonWeeks" INTEGER NOT NULL DEFAULT 14,
    "playoffWeeks" INTEGER NOT NULL DEFAULT 3,
    "byeWeekWindow" JSONB,
    "fantasyPlayoffDefault" JSONB,
    "lineupLockMode" VARCHAR(32),
    "scoringMode" VARCHAR(48),
    "regularSeasonStyle" VARCHAR(48),
    "playoffSupport" BOOLEAN NOT NULL DEFAULT true,
    "bracketModeSupported" BOOLEAN NOT NULL DEFAULT false,
    "marchMadnessMode" BOOLEAN NOT NULL DEFAULT false,
    "bowlPlayoffMetadata" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_calendars" (
    "id" TEXT NOT NULL,
    "sportType" VARCHAR(12) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "formatType" VARCHAR(32) NOT NULL,
    "preseasonPeriod" JSONB,
    "regularSeasonPeriod" JSONB NOT NULL,
    "playoffsPeriod" JSONB,
    "championshipPeriod" JSONB,
    "internationalBreaksSupported" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "season_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schedule_templates_sportType_formatType_key" ON "schedule_templates"("sportType", "formatType");

-- CreateIndex
CREATE INDEX "schedule_templates_sportType_idx" ON "schedule_templates"("sportType");

-- CreateIndex
CREATE UNIQUE INDEX "season_calendars_sportType_formatType_key" ON "season_calendars"("sportType", "formatType");

-- CreateIndex
CREATE INDEX "season_calendars_sportType_idx" ON "season_calendars"("sportType");
