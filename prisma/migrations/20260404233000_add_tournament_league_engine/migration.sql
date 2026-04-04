-- Tournament Shell engine: new tables (legacy tournament_* tables unchanged)

CREATE TABLE "tournament_shells" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'setup',
    "maxParticipants" INTEGER NOT NULL DEFAULT 120,
    "currentParticipantCount" INTEGER NOT NULL DEFAULT 0,
    "conferenceCount" INTEGER NOT NULL DEFAULT 2,
    "leaguesPerConference" INTEGER NOT NULL DEFAULT 6,
    "teamsPerLeague" INTEGER NOT NULL DEFAULT 10,
    "namingMode" TEXT NOT NULL DEFAULT 'hybrid',
    "currentRoundNumber" INTEGER NOT NULL DEFAULT 0,
    "totalRounds" INTEGER NOT NULL DEFAULT 4,
    "openingWeekStart" INTEGER NOT NULL,
    "bubbleWeek" INTEGER,
    "redraftWeek" INTEGER,
    "eliteRedraftWeek" INTEGER,
    "championshipWeek" INTEGER,
    "scoringSystem" TEXT NOT NULL DEFAULT 'ppr',
    "draftType" TEXT NOT NULL DEFAULT 'snake',
    "waiverType" TEXT NOT NULL DEFAULT 'faab',
    "advancersPerLeague" INTEGER NOT NULL DEFAULT 1,
    "wildcardCount" INTEGER NOT NULL DEFAULT 0,
    "bubbleSize" INTEGER NOT NULL DEFAULT 8,
    "bubbleEnabled" BOOLEAN NOT NULL DEFAULT true,
    "bubbleScoringMode" TEXT NOT NULL DEFAULT 'cumulative_points',
    "openingRosterSize" INTEGER NOT NULL DEFAULT 15,
    "tournamentRosterSize" INTEGER NOT NULL DEFAULT 10,
    "eliteRosterSize" INTEGER NOT NULL DEFAULT 8,
    "irEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tradeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "faabResetOnRedraft" BOOLEAN NOT NULL DEFAULT true,
    "draftClockSeconds" INTEGER NOT NULL DEFAULT 90,
    "asyncDraft" BOOLEAN NOT NULL DEFAULT false,
    "simultaneousDrafts" BOOLEAN NOT NULL DEFAULT true,
    "tiebreakerMode" TEXT NOT NULL DEFAULT 'points_for',
    "standingsVisibility" TEXT NOT NULL DEFAULT 'conference',
    "commissionerId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tournament_shells_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tournament_shells_status_idx" ON "tournament_shells"("status");
CREATE INDEX "tournament_shells_commissionerId_idx" ON "tournament_shells"("commissionerId");

ALTER TABLE "tournament_shells" ADD CONSTRAINT "tournament_shells_commissionerId_fkey" FOREIGN KEY ("commissionerId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tournament_shells" ADD CONSTRAINT "tournament_shells_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tournament_shell_conferences" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "theme" TEXT,
    "colorHex" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "conferenceNumber" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "standingsCache" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tournament_shell_conferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tournament_shell_conferences_tournamentId_conferenceNumber_key" ON "tournament_shell_conferences"("tournamentId", "conferenceNumber");
CREATE UNIQUE INDEX "tournament_shell_conferences_tournamentId_slug_key" ON "tournament_shell_conferences"("tournamentId", "slug");
CREATE INDEX "tournament_shell_conferences_tournamentId_idx" ON "tournament_shell_conferences"("tournamentId");

ALTER TABLE "tournament_shell_conferences" ADD CONSTRAINT "tournament_shell_conferences_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournament_shells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tournament_shell_rounds" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "roundType" TEXT NOT NULL,
    "roundLabel" TEXT NOT NULL,
    "weekStart" INTEGER NOT NULL,
    "weekEnd" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "leagueNamingTheme" TEXT,
    "rosterSizeOverride" INTEGER,
    "irEnabledOverride" BOOLEAN,
    "tradeEnabledOverride" BOOLEAN,
    "waiversEnabledOverride" BOOLEAN,
    "draftScheduledAt" TIMESTAMP(3),
    "roundStartedAt" TIMESTAMP(3),
    "roundCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tournament_shell_rounds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tournament_shell_rounds_tournamentId_roundNumber_key" ON "tournament_shell_rounds"("tournamentId", "roundNumber");
CREATE INDEX "tournament_shell_rounds_tournamentId_idx" ON "tournament_shell_rounds"("tournamentId");

ALTER TABLE "tournament_shell_rounds" ADD CONSTRAINT "tournament_shell_rounds_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournament_shells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tournament_shell_advancement_groups" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "conferenceId" TEXT,
    "fromRoundId" TEXT NOT NULL,
    "toRoundId" TEXT,
    "groupType" TEXT NOT NULL,
    "participantIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxSize" INTEGER NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isBubbleGroup" BOOLEAN NOT NULL DEFAULT false,
    "bubbleScoringSnapshot" JSONB,
    "bubbleWinnerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "tournament_shell_advancement_groups_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tournament_shell_advancement_groups_tournamentId_idx" ON "tournament_shell_advancement_groups"("tournamentId");
CREATE INDEX "tournament_shell_advancement_groups_conferenceId_idx" ON "tournament_shell_advancement_groups"("conferenceId");

ALTER TABLE "tournament_shell_advancement_groups" ADD CONSTRAINT "tournament_shell_advancement_groups_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournament_shells"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tournament_shell_advancement_groups" ADD CONSTRAINT "tournament_shell_advancement_groups_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "tournament_shell_conferences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "tournament_shell_leagues" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "conferenceId" TEXT,
    "roundId" TEXT NOT NULL,
    "leagueId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "colorHex" TEXT,
    "leagueNumber" INTEGER NOT NULL,
    "teamSlots" INTEGER NOT NULL,
    "currentTeamCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'forming',
    "draftScheduledAt" TIMESTAMP(3),
    "draftCompletedAt" TIMESTAMP(3),
    "draftSessionId" TEXT,
    "advancersCount" INTEGER NOT NULL DEFAULT 1,
    "advancementGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tournament_shell_leagues_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tournament_shell_leagues_leagueId_key" ON "tournament_shell_leagues"("leagueId");
CREATE UNIQUE INDEX "tournament_shell_leagues_tournamentId_name_key" ON "tournament_shell_leagues"("tournamentId", "name");
CREATE UNIQUE INDEX "tournament_shell_leagues_tournamentId_slug_key" ON "tournament_shell_leagues"("tournamentId", "slug");
CREATE INDEX "tournament_shell_leagues_tournamentId_roundId_idx" ON "tournament_shell_leagues"("tournamentId", "roundId");
CREATE INDEX "tournament_shell_leagues_conferenceId_idx" ON "tournament_shell_leagues"("conferenceId");

ALTER TABLE "tournament_shell_leagues" ADD CONSTRAINT "tournament_shell_leagues_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournament_shells"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tournament_shell_leagues" ADD CONSTRAINT "tournament_shell_leagues_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "tournament_shell_conferences"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tournament_shell_leagues" ADD CONSTRAINT "tournament_shell_leagues_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "tournament_shell_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tournament_shell_leagues" ADD CONSTRAINT "tournament_shell_leagues_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tournament_shell_leagues" ADD CONSTRAINT "tournament_shell_leagues_advancementGroupId_fkey" FOREIGN KEY ("advancementGroupId") REFERENCES "tournament_shell_advancement_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "tournament_shell_participants" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentRoundNumber" INTEGER NOT NULL DEFAULT 1,
    "furthestRoundReached" INTEGER NOT NULL DEFAULT 1,
    "totalRoundsPlayed" INTEGER NOT NULL DEFAULT 0,
    "currentConferenceId" TEXT,
    "originalConferenceId" TEXT,
    "currentLeagueId" TEXT,
    "careerWins" INTEGER NOT NULL DEFAULT 0,
    "careerLosses" INTEGER NOT NULL DEFAULT 0,
    "careerPointsFor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "careerPointsAgainst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advancementHistory" JSONB,
    "roundRosterIds" JSONB,
    "roundFaabBalances" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tournament_shell_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tournament_shell_participants_tournamentId_userId_key" ON "tournament_shell_participants"("tournamentId", "userId");
CREATE INDEX "tournament_shell_participants_tournamentId_status_idx" ON "tournament_shell_participants"("tournamentId", "status");
CREATE INDEX "tournament_shell_participants_userId_idx" ON "tournament_shell_participants"("userId");

ALTER TABLE "tournament_shell_participants" ADD CONSTRAINT "tournament_shell_participants_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournament_shells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tournament_shell_league_participants" (
    "id" TEXT NOT NULL,
    "tournamentLeagueId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsAgainst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "streak" TEXT,
    "leagueRank" INTEGER,
    "conferenceRank" INTEGER,
    "advancementStatus" TEXT NOT NULL DEFAULT 'competing',
    "redraftRosterId" TEXT,
    "draftSlot" INTEGER,
    "faabBalance" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "tournament_shell_league_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tournament_shell_league_participants_tournamentLeagueId_participantId_key" ON "tournament_shell_league_participants"("tournamentLeagueId", "participantId");
CREATE INDEX "tournament_shell_league_participants_tournamentLeagueId_idx" ON "tournament_shell_league_participants"("tournamentLeagueId");
CREATE INDEX "tournament_shell_league_participants_participantId_idx" ON "tournament_shell_league_participants"("participantId");

ALTER TABLE "tournament_shell_league_participants" ADD CONSTRAINT "tournament_shell_league_participants_tournamentLeagueId_fkey" FOREIGN KEY ("tournamentLeagueId") REFERENCES "tournament_shell_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tournament_shell_league_participants" ADD CONSTRAINT "tournament_shell_league_participants_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "tournament_shell_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tournament_shell_name_records" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "generatedName" TEXT NOT NULL,
    "finalName" TEXT NOT NULL,
    "wasEdited" BOOLEAN NOT NULL DEFAULT false,
    "namingMode" TEXT NOT NULL,
    "generationPrompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tournament_shell_name_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tournament_shell_name_records_tournamentId_entityType_idx" ON "tournament_shell_name_records"("tournamentId", "entityType");

ALTER TABLE "tournament_shell_name_records" ADD CONSTRAINT "tournament_shell_name_records_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournament_shells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tournament_shell_announcements" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundNumber" INTEGER,
    "conferenceId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL DEFAULT 'all',
    "isPosted" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tournament_shell_announcements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tournament_shell_announcements_tournamentId_type_idx" ON "tournament_shell_announcements"("tournamentId", "type");

ALTER TABLE "tournament_shell_announcements" ADD CONSTRAINT "tournament_shell_announcements_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournament_shells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tournament_shell_audit_logs" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundNumber" INTEGER,
    "action" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tournament_shell_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tournament_shell_audit_logs_tournamentId_action_idx" ON "tournament_shell_audit_logs"("tournamentId", "action");

ALTER TABLE "tournament_shell_audit_logs" ADD CONSTRAINT "tournament_shell_audit_logs_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournament_shells"("id") ON DELETE CASCADE ON UPDATE CASCADE;
