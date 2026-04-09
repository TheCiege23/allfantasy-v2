-- =============================================================================
-- supabase_ensure_tournament_tables.sql
-- Tournament Mode tables — multi-league connected tournament system.
-- =============================================================================

-- TournamentShell (main tournament container)
CREATE TABLE IF NOT EXISTS "tournament_shells" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sport" TEXT NOT NULL,
  "status" TEXT DEFAULT 'setup',
  "maxParticipants" INTEGER DEFAULT 120,
  "currentParticipantCount" INTEGER DEFAULT 0,
  "conferenceCount" INTEGER DEFAULT 2,
  "leaguesPerConference" INTEGER DEFAULT 5,
  "teamsPerLeague" INTEGER DEFAULT 12,
  "namingMode" TEXT DEFAULT 'ai_generated',
  "currentRoundNumber" INTEGER DEFAULT 0,
  "totalRounds" INTEGER DEFAULT 4,
  "creatorId" TEXT,
  "settings" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tournament_shells_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "tournament_shells_sport_idx" ON "tournament_shells" ("sport");

-- TournamentConference
CREATE TABLE IF NOT EXISTS "tournament_conferences" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT,
  "theme" TEXT,
  "colorHex" TEXT,
  "logoUrl" TEXT,
  "bannerUrl" TEXT,
  "conferenceNumber" INTEGER DEFAULT 1,
  "isActive" BOOLEAN DEFAULT true,
  "standingsCache" JSONB DEFAULT '[]',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tournament_conferences_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "tournament_conferences_tournamentId_idx" ON "tournament_conferences" ("tournamentId");

-- TournamentRound
CREATE TABLE IF NOT EXISTS "tournament_rounds" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "roundNumber" INTEGER NOT NULL,
  "roundType" TEXT DEFAULT 'qualification',
  "roundLabel" TEXT,
  "weekStart" INTEGER,
  "weekEnd" INTEGER,
  "status" TEXT DEFAULT 'pending',
  "leagueNamingTheme" TEXT,
  "rosterSizeOverride" INTEGER,
  "benchSizeOverride" INTEGER,
  "irEnabledOverride" BOOLEAN,
  "tradeEnabledOverride" BOOLEAN,
  "faabResetAmount" INTEGER,
  "advancersPerLeague" INTEGER DEFAULT 4,
  "bubbleSize" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tournament_rounds_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "tournament_rounds_tournamentId_idx" ON "tournament_rounds" ("tournamentId");

-- TournamentLeague (league within tournament)
CREATE TABLE IF NOT EXISTS "tournament_leagues" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "conferenceId" TEXT,
  "roundId" TEXT,
  "leagueId" TEXT,
  "name" TEXT NOT NULL,
  "slug" TEXT,
  "draftOrderSeedOverride" JSONB,
  "scoringOverride" JSONB,
  "status" TEXT DEFAULT 'active',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tournament_leagues_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "tournament_leagues_tournamentId_idx" ON "tournament_leagues" ("tournamentId");
CREATE INDEX IF NOT EXISTS "tournament_leagues_roundId_idx" ON "tournament_leagues" ("roundId");
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_leagues_leagueId_key" ON "tournament_leagues" ("leagueId");

-- TournamentParticipant
CREATE TABLE IF NOT EXISTS "tournament_participants" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "displayName" TEXT,
  "avatarUrl" TEXT,
  "status" TEXT DEFAULT 'active',
  "currentRoundNumber" INTEGER DEFAULT 0,
  "furthestRoundReached" INTEGER DEFAULT 0,
  "totalRoundsPlayed" INTEGER DEFAULT 0,
  "currentConferenceId" TEXT,
  "currentLeagueId" TEXT,
  "eliminatedAtRound" INTEGER,
  "eliminatedReason" TEXT,
  "totalWins" INTEGER DEFAULT 0,
  "totalLosses" INTEGER DEFAULT 0,
  "totalPointsFor" DOUBLE PRECISION DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "tournament_participants_tournamentId_idx" ON "tournament_participants" ("tournamentId");
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_participants_tournament_user_key" ON "tournament_participants" ("tournamentId", "userId");

-- TournamentLeagueParticipant (participant standing in specific league)
CREATE TABLE IF NOT EXISTS "tournament_league_participants" (
  "id" TEXT NOT NULL,
  "tournamentLeagueId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "wins" INTEGER DEFAULT 0,
  "losses" INTEGER DEFAULT 0,
  "ties" INTEGER DEFAULT 0,
  "pointsFor" DOUBLE PRECISION DEFAULT 0,
  "pointsAgainst" DOUBLE PRECISION DEFAULT 0,
  "streak" TEXT,
  "rank" INTEGER,
  "advanced" BOOLEAN DEFAULT false,
  "eliminated" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tournament_league_participants_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "tournament_league_participants_leagueId_idx" ON "tournament_league_participants" ("tournamentLeagueId");

-- TournamentAnnouncement
CREATE TABLE IF NOT EXISTS "tournament_announcements" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "roundNumber" INTEGER,
  "type" TEXT NOT NULL,
  "title" TEXT,
  "body" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tournament_announcements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "tournament_announcements_tournamentId_idx" ON "tournament_announcements" ("tournamentId");

-- TournamentAuditLog
CREATE TABLE IF NOT EXISTS "tournament_audit_logs" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorUserId" TEXT,
  "targetUserId" TEXT,
  "roundNumber" INTEGER,
  "data" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tournament_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "tournament_audit_logs_tournamentId_idx" ON "tournament_audit_logs" ("tournamentId");
