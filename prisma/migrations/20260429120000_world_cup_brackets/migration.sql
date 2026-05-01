-- FIFA World Cup bracket challenge vertical slice.
CREATE TABLE "world_cup_teams" (
  "id" TEXT NOT NULL,
  "apiTeamId" INTEGER,
  "fifaCode" TEXT,
  "name" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "flagUrl" TEXT,
  "logoUrl" TEXT,
  "groupName" TEXT,
  "qualificationStatus" TEXT NOT NULL DEFAULT 'tbd',
  "sourcePayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "world_cup_teams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "world_cup_bracket_scoring_profiles" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "roundOf32Points" INTEGER NOT NULL DEFAULT 1,
  "roundOf16Points" INTEGER NOT NULL DEFAULT 2,
  "quarterFinalPoints" INTEGER NOT NULL DEFAULT 4,
  "semiFinalPoints" INTEGER NOT NULL DEFAULT 8,
  "finalPoints" INTEGER NOT NULL DEFAULT 16,
  "championBonusPoints" INTEGER NOT NULL DEFAULT 0,
  "thirdPlacePoints" INTEGER,
  "upsetBonusEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "world_cup_bracket_scoring_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "world_cup_bracket_challenges" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "seasonYear" INTEGER NOT NULL DEFAULT 2026,
  "tournamentKey" TEXT NOT NULL DEFAULT 'fifa_world_cup',
  "inviteCode" TEXT NOT NULL,
  "inviteUrl" TEXT,
  "visibility" TEXT NOT NULL DEFAULT 'private',
  "pickLockStrategy" TEXT NOT NULL DEFAULT 'per_match',
  "pickLockAt" TIMESTAMP(3),
  "scoringProfileId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "includeThirdPlace" BOOLEAN NOT NULL DEFAULT false,
  "lastSyncedAt" TIMESTAMP(3),
  "sourcePayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "world_cup_bracket_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "world_cup_bracket_slots" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "slotKey" TEXT NOT NULL,
  "round" TEXT NOT NULL,
  "region" TEXT,
  "sourceGroup" TEXT,
  "sourceRank" TEXT,
  "teamId" TEXT,
  "displayName" TEXT NOT NULL,
  "lockedAt" TIMESTAMP(3),
  "isPlaceholder" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "world_cup_bracket_slots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "world_cup_bracket_participants" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "totalScore" INTEGER NOT NULL DEFAULT 0,
  "maxPossibleScore" INTEGER NOT NULL DEFAULT 0,
  "championPickTeamId" TEXT,
  "championPickName" TEXT,
  "correctPicks" INTEGER NOT NULL DEFAULT 0,
  "rank" INTEGER,
  "roundBreakdown" JSONB,
  CONSTRAINT "world_cup_bracket_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "world_cup_bracket_matches" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "apiFixtureId" INTEGER,
  "round" TEXT NOT NULL,
  "roundIndex" INTEGER NOT NULL,
  "matchNumber" INTEGER NOT NULL,
  "homeSlotKey" TEXT NOT NULL,
  "awaySlotKey" TEXT NOT NULL,
  "homeTeamId" TEXT,
  "awayTeamId" TEXT,
  "homeTeamName" TEXT NOT NULL,
  "awayTeamName" TEXT NOT NULL,
  "homeTeamLogo" TEXT,
  "awayTeamLogo" TEXT,
  "homeScore" INTEGER,
  "awayScore" INTEGER,
  "homePenaltyScore" INTEGER,
  "awayPenaltyScore" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "startsAt" TIMESTAMP(3),
  "winnerTeamId" TEXT,
  "winnerTeamName" TEXT,
  "nextMatchId" TEXT,
  "nextMatchSlot" TEXT,
  "sourcePayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "world_cup_bracket_matches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "world_cup_bracket_picks" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "round" TEXT NOT NULL,
  "selectedTeamId" TEXT,
  "selectedSlotKey" TEXT,
  "selectedTeamName" TEXT NOT NULL,
  "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
  "isCorrect" BOOLEAN,
  "lockedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "world_cup_bracket_picks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "world_cup_bracket_invites" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "inviteCode" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "maxUses" INTEGER,
  "useCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "world_cup_bracket_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "world_cup_teams_apiTeamId_key" ON "world_cup_teams"("apiTeamId");
CREATE INDEX "world_cup_teams_qualificationStatus_idx" ON "world_cup_teams"("qualificationStatus");
CREATE INDEX "world_cup_teams_name_idx" ON "world_cup_teams"("name");
CREATE UNIQUE INDEX "world_cup_bracket_challenges_inviteCode_key" ON "world_cup_bracket_challenges"("inviteCode");
CREATE INDEX "world_cup_bracket_challenges_ownerUserId_idx" ON "world_cup_bracket_challenges"("ownerUserId");
CREATE INDEX "world_cup_bracket_challenges_inviteCode_idx" ON "world_cup_bracket_challenges"("inviteCode");
CREATE INDEX "world_cup_bracket_challenges_seasonYear_tournamentKey_idx" ON "world_cup_bracket_challenges"("seasonYear", "tournamentKey");
CREATE INDEX "world_cup_bracket_challenges_status_idx" ON "world_cup_bracket_challenges"("status");
CREATE UNIQUE INDEX "world_cup_bracket_slots_challengeId_slotKey_key" ON "world_cup_bracket_slots"("challengeId", "slotKey");
CREATE INDEX "world_cup_bracket_slots_challengeId_idx" ON "world_cup_bracket_slots"("challengeId");
CREATE INDEX "world_cup_bracket_slots_teamId_idx" ON "world_cup_bracket_slots"("teamId");
CREATE INDEX "world_cup_bracket_slots_round_idx" ON "world_cup_bracket_slots"("round");
CREATE UNIQUE INDEX "world_cup_bracket_participants_challengeId_userId_key" ON "world_cup_bracket_participants"("challengeId", "userId");
CREATE INDEX "world_cup_bracket_participants_challengeId_idx" ON "world_cup_bracket_participants"("challengeId");
CREATE INDEX "world_cup_bracket_participants_userId_idx" ON "world_cup_bracket_participants"("userId");
CREATE INDEX "world_cup_bracket_participants_rank_idx" ON "world_cup_bracket_participants"("rank");
CREATE UNIQUE INDEX "world_cup_bracket_matches_challengeId_matchNumber_key" ON "world_cup_bracket_matches"("challengeId", "matchNumber");
CREATE UNIQUE INDEX "world_cup_bracket_matches_challengeId_apiFixtureId_key" ON "world_cup_bracket_matches"("challengeId", "apiFixtureId");
CREATE INDEX "world_cup_bracket_matches_challengeId_idx" ON "world_cup_bracket_matches"("challengeId");
CREATE INDEX "world_cup_bracket_matches_apiFixtureId_idx" ON "world_cup_bracket_matches"("apiFixtureId");
CREATE INDEX "world_cup_bracket_matches_round_idx" ON "world_cup_bracket_matches"("round");
CREATE INDEX "world_cup_bracket_matches_status_idx" ON "world_cup_bracket_matches"("status");
CREATE INDEX "world_cup_bracket_matches_nextMatchId_idx" ON "world_cup_bracket_matches"("nextMatchId");
CREATE UNIQUE INDEX "world_cup_bracket_picks_matchId_participantId_key" ON "world_cup_bracket_picks"("matchId", "participantId");
CREATE INDEX "world_cup_bracket_picks_challengeId_idx" ON "world_cup_bracket_picks"("challengeId");
CREATE INDEX "world_cup_bracket_picks_participantId_idx" ON "world_cup_bracket_picks"("participantId");
CREATE INDEX "world_cup_bracket_picks_matchId_idx" ON "world_cup_bracket_picks"("matchId");
CREATE INDEX "world_cup_bracket_picks_round_idx" ON "world_cup_bracket_picks"("round");
CREATE UNIQUE INDEX "world_cup_bracket_invites_inviteCode_key" ON "world_cup_bracket_invites"("inviteCode");
CREATE INDEX "world_cup_bracket_invites_challengeId_idx" ON "world_cup_bracket_invites"("challengeId");
CREATE INDEX "world_cup_bracket_invites_createdByUserId_idx" ON "world_cup_bracket_invites"("createdByUserId");
CREATE INDEX "world_cup_bracket_invites_inviteCode_idx" ON "world_cup_bracket_invites"("inviteCode");

ALTER TABLE "world_cup_bracket_challenges" ADD CONSTRAINT "world_cup_bracket_challenges_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "world_cup_bracket_challenges" ADD CONSTRAINT "world_cup_bracket_challenges_scoringProfileId_fkey" FOREIGN KEY ("scoringProfileId") REFERENCES "world_cup_bracket_scoring_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "world_cup_bracket_slots" ADD CONSTRAINT "world_cup_bracket_slots_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "world_cup_bracket_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "world_cup_bracket_slots" ADD CONSTRAINT "world_cup_bracket_slots_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "world_cup_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "world_cup_bracket_participants" ADD CONSTRAINT "world_cup_bracket_participants_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "world_cup_bracket_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "world_cup_bracket_participants" ADD CONSTRAINT "world_cup_bracket_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "world_cup_bracket_participants" ADD CONSTRAINT "world_cup_bracket_participants_championPickTeamId_fkey" FOREIGN KEY ("championPickTeamId") REFERENCES "world_cup_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "world_cup_bracket_matches" ADD CONSTRAINT "world_cup_bracket_matches_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "world_cup_bracket_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "world_cup_bracket_matches" ADD CONSTRAINT "world_cup_bracket_matches_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "world_cup_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "world_cup_bracket_matches" ADD CONSTRAINT "world_cup_bracket_matches_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "world_cup_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "world_cup_bracket_matches" ADD CONSTRAINT "world_cup_bracket_matches_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "world_cup_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "world_cup_bracket_matches" ADD CONSTRAINT "world_cup_bracket_matches_nextMatchId_fkey" FOREIGN KEY ("nextMatchId") REFERENCES "world_cup_bracket_matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "world_cup_bracket_picks" ADD CONSTRAINT "world_cup_bracket_picks_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "world_cup_bracket_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "world_cup_bracket_picks" ADD CONSTRAINT "world_cup_bracket_picks_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "world_cup_bracket_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "world_cup_bracket_picks" ADD CONSTRAINT "world_cup_bracket_picks_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "world_cup_bracket_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "world_cup_bracket_picks" ADD CONSTRAINT "world_cup_bracket_picks_selectedTeamId_fkey" FOREIGN KEY ("selectedTeamId") REFERENCES "world_cup_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "world_cup_bracket_invites" ADD CONSTRAINT "world_cup_bracket_invites_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "world_cup_bracket_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "world_cup_bracket_invites" ADD CONSTRAINT "world_cup_bracket_invites_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
