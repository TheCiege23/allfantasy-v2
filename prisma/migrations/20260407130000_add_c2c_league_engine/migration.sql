-- Campus 2 Canton (C2C) engine tables

CREATE TABLE "c2c_leagues" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "isDynastyOnly" BOOLEAN NOT NULL DEFAULT true,
    "createdByTheCiege" BOOLEAN NOT NULL DEFAULT true,
    "sportPair" TEXT NOT NULL DEFAULT 'NFL_CFB',
    "scoringMode" TEXT NOT NULL DEFAULT 'combined_total',
    "campusScoreWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "cantonScoreWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "campusStarterSlots" INTEGER NOT NULL DEFAULT 8,
    "cantonStarterSlots" INTEGER NOT NULL DEFAULT 8,
    "benchSlots" INTEGER NOT NULL DEFAULT 8,
    "taxiSlots" INTEGER NOT NULL DEFAULT 4,
    "devySlots" INTEGER NOT NULL DEFAULT 6,
    "irSlots" INTEGER NOT NULL DEFAULT 2,
    "taxiRookieOnly" BOOLEAN NOT NULL DEFAULT true,
    "taxiMaxExperienceYears" INTEGER NOT NULL DEFAULT 1,
    "taxiLockDeadline" TIMESTAMP(3),
    "taxiPointsVisible" BOOLEAN NOT NULL DEFAULT true,
    "devyScoringEnabled" BOOLEAN NOT NULL DEFAULT false,
    "startupDraftFormat" TEXT NOT NULL DEFAULT 'split_campus_canton',
    "futureDraftFormat" TEXT NOT NULL DEFAULT 'combined',
    "footballCampusLockDay" TEXT NOT NULL DEFAULT 'saturday_kickoff',
    "footballCantonLockDay" TEXT NOT NULL DEFAULT 'sunday_kickoff_per_player',
    "basketballLineupFreq" TEXT NOT NULL DEFAULT 'weekly',
    "season" INTEGER NOT NULL DEFAULT 2025,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "c2c_leagues_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "c2c_leagues_leagueId_key" ON "c2c_leagues"("leagueId");
CREATE INDEX "c2c_leagues_leagueId_idx" ON "c2c_leagues"("leagueId");
CREATE INDEX "c2c_leagues_sportPair_idx" ON "c2c_leagues"("sportPair");

ALTER TABLE "c2c_leagues" ADD CONSTRAINT "c2c_leagues_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "c2c_player_states" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "sport" TEXT NOT NULL DEFAULT 'NFL',
    "playerSide" TEXT NOT NULL,
    "playerType" TEXT NOT NULL DEFAULT 'active',
    "bucketState" TEXT NOT NULL DEFAULT 'bench',
    "scoringEligibility" TEXT NOT NULL,
    "school" TEXT,
    "schoolLogoUrl" TEXT,
    "classYear" TEXT,
    "projectedDeclarationYear" INTEGER,
    "hasEnteredPro" BOOLEAN NOT NULL DEFAULT false,
    "proEntryYear" INTEGER,
    "proEntryMethod" TEXT,
    "nflNbaTeam" TEXT,
    "isRookieEligible" BOOLEAN NOT NULL DEFAULT false,
    "isTaxiEligible" BOOLEAN NOT NULL DEFAULT false,
    "taxiYearsUsed" INTEGER NOT NULL DEFAULT 0,
    "transitionedFrom" TEXT,
    "transitionedAt" TIMESTAMP(3),
    "transitionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "c2c_player_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "c2c_player_states_leagueId_rosterId_playerId_key" ON "c2c_player_states"("leagueId", "rosterId", "playerId");
CREATE INDEX "c2c_player_states_leagueId_playerSide_bucketState_idx" ON "c2c_player_states"("leagueId", "playerSide", "bucketState");

ALTER TABLE "c2c_player_states" ADD CONSTRAINT "c2c_player_states_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "c2c_leagues"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "c2c_player_states" ADD CONSTRAINT "c2c_player_states_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "c2c_matchup_scores" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "matchupId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "campusStarterScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cantonStarterScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "benchDisplayScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxiDisplayScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "devyDisplayScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "officialTeamScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "campusMatchupResult" TEXT,
    "cantonMatchupResult" TEXT,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "c2c_matchup_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "c2c_matchup_scores_leagueId_matchupId_rosterId_key" ON "c2c_matchup_scores"("leagueId", "matchupId", "rosterId");
CREATE INDEX "c2c_matchup_scores_leagueId_week_idx" ON "c2c_matchup_scores"("leagueId", "week");

ALTER TABLE "c2c_matchup_scores" ADD CONSTRAINT "c2c_matchup_scores_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "c2c_leagues"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "c2c_matchup_scores" ADD CONSTRAINT "c2c_matchup_scores_matchupId_fkey" FOREIGN KEY ("matchupId") REFERENCES "redraft_matchups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "c2c_draft_picks" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "pickSide" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "originalOwnerId" TEXT NOT NULL,
    "currentOwnerId" TEXT NOT NULL,
    "isTradeable" BOOLEAN NOT NULL DEFAULT true,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedOnPlayerId" TEXT,
    "usedAt" TIMESTAMP(3),
    "tradeHistory" JSONB,

    CONSTRAINT "c2c_draft_picks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "c2c_draft_picks_leagueId_pickSide_season_round_originalOwnerId_key" ON "c2c_draft_picks"("leagueId", "pickSide", "season", "round", "originalOwnerId");
CREATE INDEX "c2c_draft_picks_leagueId_currentOwnerId_idx" ON "c2c_draft_picks"("leagueId", "currentOwnerId");
CREATE INDEX "c2c_draft_picks_leagueId_pickSide_season_idx" ON "c2c_draft_picks"("leagueId", "pickSide", "season");

ALTER TABLE "c2c_draft_picks" ADD CONSTRAINT "c2c_draft_picks_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "c2c_leagues"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "c2c_transition_records" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "fromState" TEXT NOT NULL,
    "toState" TEXT NOT NULL,
    "proEntryYear" INTEGER NOT NULL,
    "proEntryMethod" TEXT NOT NULL,
    "destinationBucket" TEXT NOT NULL,
    "wasAutoTransitioned" BOOLEAN NOT NULL DEFAULT false,
    "commissionerApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "transitionedAt" TIMESTAMP(3),

    CONSTRAINT "c2c_transition_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "c2c_transition_records_leagueId_proEntryYear_idx" ON "c2c_transition_records"("leagueId", "proEntryYear");

ALTER TABLE "c2c_transition_records" ADD CONSTRAINT "c2c_transition_records_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
