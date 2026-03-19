-- PROMPT 3/5: Taxi settings on DynastyLeagueConfig; return-to-school on DevyLeagueConfig.
ALTER TABLE "dynasty_league_configs" ADD COLUMN "taxiSlots" INTEGER NOT NULL DEFAULT 4;
ALTER TABLE "dynasty_league_configs" ADD COLUMN "taxiEligibilityYears" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "dynasty_league_configs" ADD COLUMN "taxiLockBehavior" VARCHAR(32) NOT NULL DEFAULT 'once_promoted_no_return';
ALTER TABLE "dynasty_league_configs" ADD COLUMN "taxiInSeasonMoves" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "dynasty_league_configs" ADD COLUMN "taxiPostseasonMoves" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "dynasty_league_configs" ADD COLUMN "taxiScoringOn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "dynasty_league_configs" ADD COLUMN "taxiDeadlineWeek" INTEGER;
ALTER TABLE "dynasty_league_configs" ADD COLUMN "taxiPromotionDeadlineWeek" INTEGER;

ALTER TABLE "devy_league_configs" ADD COLUMN "returnToSchoolHandling" VARCHAR(32) NOT NULL DEFAULT 'restore_rights';
