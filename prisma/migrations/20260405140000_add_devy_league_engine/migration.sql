-- Devy League engine: full roster buckets, taxi/devy slots, draft picks

CREATE TABLE IF NOT EXISTS "devy_leagues" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "isDynastyOnly" BOOLEAN NOT NULL DEFAULT true,
    "createdByTheCiege" BOOLEAN NOT NULL DEFAULT true,
    "startupDraftFormat" TEXT NOT NULL DEFAULT 'combined',
    "futureDraftFormat" TEXT NOT NULL DEFAULT 'combined',
    "activeRosterSize" INTEGER NOT NULL DEFAULT 20,
    "benchSlots" INTEGER NOT NULL DEFAULT 6,
    "irSlots" INTEGER NOT NULL DEFAULT 2,
    "taxiSlots" INTEGER NOT NULL DEFAULT 5,
    "devySlots" INTEGER NOT NULL DEFAULT 10,
    "maxDevyPerTeam" INTEGER NOT NULL DEFAULT 10,
    "taxiRookieOnly" BOOLEAN NOT NULL DEFAULT true,
    "taxiAllowNonRookies" BOOLEAN NOT NULL DEFAULT false,
    "taxiMaxExperienceYears" INTEGER NOT NULL DEFAULT 1,
    "taxiLockDeadline" TIMESTAMP(3),
    "taxiCanReturnAfterPromo" BOOLEAN NOT NULL DEFAULT false,
    "taxiAutoQualifyRookies" BOOLEAN NOT NULL DEFAULT true,
    "taxiDevyToRookieEligible" BOOLEAN NOT NULL DEFAULT true,
    "taxiPointsVisibleDisplay" BOOLEAN NOT NULL DEFAULT true,
    "taxiPointsCountToward" BOOLEAN NOT NULL DEFAULT false,
    "taxiPoachaingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "devyFreshmenEligible" BOOLEAN NOT NULL DEFAULT false,
    "devyAutoPromoteToRookie" BOOLEAN NOT NULL DEFAULT true,
    "devyDeclarationVisibility" BOOLEAN NOT NULL DEFAULT true,
    "rookiePickTradingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "devyPickTradingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "devyGradBehavior" TEXT NOT NULL DEFAULT 'move_to_taxi',
    "season" INTEGER NOT NULL DEFAULT 2025,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "devy_leagues_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "devy_leagues_leagueId_key" ON "devy_leagues"("leagueId");
CREATE INDEX IF NOT EXISTS "devy_leagues_leagueId_idx" ON "devy_leagues"("leagueId");

ALTER TABLE "devy_leagues" DROP CONSTRAINT IF EXISTS "devy_leagues_leagueId_fkey";
ALTER TABLE "devy_leagues" ADD CONSTRAINT "devy_leagues_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "devy_player_states" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "playerType" TEXT NOT NULL,
    "bucketState" TEXT NOT NULL DEFAULT 'active_bench',
    "scoringEligibility" TEXT NOT NULL DEFAULT 'display_only',
    "school" TEXT,
    "classYear" TEXT,
    "projectedDeclarationYear" INTEGER,
    "isDevyEligible" BOOLEAN NOT NULL DEFAULT false,
    "isRookieEligible" BOOLEAN NOT NULL DEFAULT false,
    "nflDraftYear" INTEGER,
    "nflDraftRound" INTEGER,
    "nflDraftPick" INTEGER,
    "isTaxiEligible" BOOLEAN NOT NULL DEFAULT false,
    "taxiYearsUsed" INTEGER NOT NULL DEFAULT 0,
    "transitionedFrom" TEXT,
    "transitionedAt" TIMESTAMP(3),
    "transitionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "devy_player_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "devy_player_states_leagueId_rosterId_playerId_key" ON "devy_player_states"("leagueId", "rosterId", "playerId");
CREATE INDEX IF NOT EXISTS "devy_player_states_leagueId_playerType_idx" ON "devy_player_states"("leagueId", "playerType");
CREATE INDEX IF NOT EXISTS "devy_player_states_leagueId_bucketState_idx" ON "devy_player_states"("leagueId", "bucketState");
CREATE INDEX IF NOT EXISTS "devy_player_states_rosterId_idx" ON "devy_player_states"("rosterId");

ALTER TABLE "devy_player_states" DROP CONSTRAINT IF EXISTS "devy_player_states_leagueId_fkey";
ALTER TABLE "devy_player_states" ADD CONSTRAINT "devy_player_states_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "devy_leagues"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devy_player_states" DROP CONSTRAINT IF EXISTS "devy_player_states_rosterId_fkey";
ALTER TABLE "devy_player_states" ADD CONSTRAINT "devy_player_states_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "devy_taxi_slots" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "taxiYearStart" INTEGER NOT NULL,
    "taxiYearsCurrent" INTEGER NOT NULL DEFAULT 1,
    "isEligible" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promotedAt" TIMESTAMP(3),
    "promotedToState" TEXT,
    CONSTRAINT "devy_taxi_slots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "devy_taxi_slots_leagueId_rosterId_playerId_key" ON "devy_taxi_slots"("leagueId", "rosterId", "playerId");
CREATE INDEX IF NOT EXISTS "devy_taxi_slots_leagueId_rosterId_idx" ON "devy_taxi_slots"("leagueId", "rosterId");

ALTER TABLE "devy_taxi_slots" DROP CONSTRAINT IF EXISTS "devy_taxi_slots_leagueId_fkey";
ALTER TABLE "devy_taxi_slots" ADD CONSTRAINT "devy_taxi_slots_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "devy_leagues"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devy_taxi_slots" DROP CONSTRAINT IF EXISTS "devy_taxi_slots_rosterId_fkey";
ALTER TABLE "devy_taxi_slots" ADD CONSTRAINT "devy_taxi_slots_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "devy_devy_slots" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "school" TEXT,
    "schoolLogoUrl" TEXT,
    "classYear" TEXT,
    "projectedDeclarationYear" INTEGER,
    "hasEnteredNFL" BOOLEAN NOT NULL DEFAULT false,
    "nflEntryYear" INTEGER,
    "nflEntryStatus" TEXT,
    "rightsAcquiredVia" TEXT,
    "rightsAcquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transitionedAt" TIMESTAMP(3),
    "transitionQueue" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "devy_devy_slots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "devy_devy_slots_leagueId_rosterId_playerId_key" ON "devy_devy_slots"("leagueId", "rosterId", "playerId");
CREATE INDEX IF NOT EXISTS "devy_devy_slots_leagueId_rosterId_idx" ON "devy_devy_slots"("leagueId", "rosterId");
CREATE INDEX IF NOT EXISTS "devy_devy_slots_leagueId_hasEnteredNFL_idx" ON "devy_devy_slots"("leagueId", "hasEnteredNFL");

ALTER TABLE "devy_devy_slots" DROP CONSTRAINT IF EXISTS "devy_devy_slots_leagueId_fkey";
ALTER TABLE "devy_devy_slots" ADD CONSTRAINT "devy_devy_slots_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "devy_leagues"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devy_devy_slots" DROP CONSTRAINT IF EXISTS "devy_devy_slots_rosterId_fkey";
ALTER TABLE "devy_devy_slots" ADD CONSTRAINT "devy_devy_slots_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "devy_rookie_transitions" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "school" TEXT,
    "nflEntryYear" INTEGER NOT NULL,
    "nflEntryMethod" TEXT NOT NULL,
    "previousState" TEXT NOT NULL DEFAULT 'devy',
    "destinationState" TEXT NOT NULL,
    "wasAutoTransitioned" BOOLEAN NOT NULL DEFAULT false,
    "wasCommissionerReview" BOOLEAN NOT NULL DEFAULT false,
    "commissionerApprovedAt" TIMESTAMP(3),
    "transitionedAt" TIMESTAMP(3),
    "notes" TEXT,
    CONSTRAINT "devy_rookie_transitions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "devy_rookie_transitions_leagueId_nflEntryYear_idx" ON "devy_rookie_transitions"("leagueId", "nflEntryYear");

ALTER TABLE "devy_rookie_transitions" DROP CONSTRAINT IF EXISTS "devy_rookie_transitions_leagueId_fkey";
ALTER TABLE "devy_rookie_transitions" ADD CONSTRAINT "devy_rookie_transitions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "devy_leagues"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devy_rookie_transitions" DROP CONSTRAINT IF EXISTS "devy_rookie_transitions_rosterId_fkey";
ALTER TABLE "devy_rookie_transitions" ADD CONSTRAINT "devy_rookie_transitions_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "devy_draft_picks" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "pickType" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "originalOwnerId" TEXT NOT NULL,
    "currentOwnerId" TEXT NOT NULL,
    "isTradeable" BOOLEAN NOT NULL DEFAULT true,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedOnPlayerId" TEXT,
    "usedAt" TIMESTAMP(3),
    "tradeHistory" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "devy_draft_picks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "devy_draft_picks_leagueId_pickType_season_round_originalOwnerId_key" ON "devy_draft_picks"("leagueId", "pickType", "season", "round", "originalOwnerId");
CREATE INDEX IF NOT EXISTS "devy_draft_picks_leagueId_currentOwnerId_idx" ON "devy_draft_picks"("leagueId", "currentOwnerId");
CREATE INDEX IF NOT EXISTS "devy_draft_picks_leagueId_pickType_season_idx" ON "devy_draft_picks"("leagueId", "pickType", "season");

ALTER TABLE "devy_draft_picks" DROP CONSTRAINT IF EXISTS "devy_draft_picks_leagueId_fkey";
ALTER TABLE "devy_draft_picks" ADD CONSTRAINT "devy_draft_picks_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "devy_leagues"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;
