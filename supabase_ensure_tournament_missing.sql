-- Only create tables that don't already exist from Prisma migration
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

-- Add missing columns to existing tables
ALTER TABLE "tournament_rounds" ADD COLUMN IF NOT EXISTS "benchSizeOverride" INTEGER;
ALTER TABLE "tournament_rounds" ADD COLUMN IF NOT EXISTS "faabResetAmount" INTEGER;
ALTER TABLE "tournament_rounds" ADD COLUMN IF NOT EXISTS "advancersPerLeague" INTEGER DEFAULT 4;
ALTER TABLE "tournament_rounds" ADD COLUMN IF NOT EXISTS "bubbleSize" INTEGER DEFAULT 0;

ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "currentLeagueId" TEXT;
ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "eliminatedAtRound" INTEGER;
ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "eliminatedReason" TEXT;
ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "totalWins" INTEGER DEFAULT 0;
ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "totalLosses" INTEGER DEFAULT 0;
ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "totalPointsFor" DOUBLE PRECISION DEFAULT 0;
