-- AlterTable: extend sport_configs with centralized sport metadata (lib/sportConfig)

ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "displayName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "defaultScoringSystem" TEXT NOT NULL DEFAULT 'points';
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "scoringCategories" JSONB;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "scoringPresets" JSONB;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "defaultRosterSlots" JSONB;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "defaultBenchSlots" INTEGER NOT NULL DEFAULT 6;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "defaultIRSlots" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "defaultTaxiSlots" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "defaultDevySlots" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "positionEligibility" JSONB;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "defaultSeasonWeeks" INTEGER NOT NULL DEFAULT 17;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "defaultPlayoffStartWeek" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "defaultPlayoffTeams" INTEGER NOT NULL DEFAULT 4;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "defaultMatchupPeriodDays" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "lineupLockType" TEXT NOT NULL DEFAULT 'per_player_kickoff';
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "supportsRedraft" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "supportsDynasty" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "supportsKeeper" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "supportsDevy" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "supportsC2C" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "supportsIDP" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "supportsSuperflex" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "supportsTEPremium" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "supportsPPR" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "supportsCategories" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "supportsDailyLineups" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "commissionerSettings" JSONB;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "aiMetadata" JSONB;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "sport_configs_slug_key" ON "sport_configs"("slug");

UPDATE "sport_configs" SET "slug" = LOWER("sport") WHERE "slug" IS NULL;
