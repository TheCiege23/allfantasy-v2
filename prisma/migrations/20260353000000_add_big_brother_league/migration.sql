-- Big Brother League Engine (PROMPT 2/6): config, cycles, votes, jury, finale, audit.

CREATE TABLE "big_brother_league_configs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "hohChallengeDayOfWeek" INTEGER,
    "hohChallengeTimeUtc" VARCHAR(16),
    "nominationDeadlineDayOfWeek" INTEGER,
    "nominationDeadlineTimeUtc" VARCHAR(16),
    "vetoDrawDayOfWeek" INTEGER,
    "vetoDrawTimeUtc" VARCHAR(16),
    "vetoDecisionDeadlineDayOfWeek" INTEGER,
    "vetoDecisionDeadlineTimeUtc" VARCHAR(16),
    "replacementNomineeDeadlineDayOfWeek" INTEGER,
    "replacementNomineeDeadlineTimeUtc" VARCHAR(16),
    "evictionVoteOpenDayOfWeek" INTEGER,
    "evictionVoteOpenTimeUtc" VARCHAR(16),
    "evictionVoteCloseDayOfWeek" INTEGER,
    "evictionVoteCloseTimeUtc" VARCHAR(16),
    "finalNomineeCount" INTEGER NOT NULL DEFAULT 2,
    "vetoCompetitorCount" INTEGER NOT NULL DEFAULT 6,
    "consecutiveHohAllowed" BOOLEAN NOT NULL DEFAULT false,
    "hohVotesOnlyInTie" BOOLEAN NOT NULL DEFAULT true,
    "juryStartMode" VARCHAR(32) NOT NULL DEFAULT 'after_eliminations',
    "juryStartAfterEliminations" INTEGER,
    "juryStartWhenRemaining" INTEGER,
    "juryStartWeek" INTEGER,
    "finaleFormat" VARCHAR(16) NOT NULL DEFAULT 'final_2',
    "waiverReleaseTiming" VARCHAR(32) NOT NULL DEFAULT 'next_waiver_run',
    "publicVoteTotalsVisibility" VARCHAR(24) NOT NULL DEFAULT 'evicted_only',
    "challengeMode" VARCHAR(32) NOT NULL DEFAULT 'hybrid',
    "antiCollusionLogging" BOOLEAN NOT NULL DEFAULT true,
    "inactivePlayerHandling" VARCHAR(32) NOT NULL DEFAULT 'commissioner_only',
    "autoNominationFallback" VARCHAR(32) NOT NULL DEFAULT 'lowest_season_points',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "big_brother_league_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "big_brother_league_configs_leagueId_key" ON "big_brother_league_configs"("leagueId");

CREATE TABLE "big_brother_cycles" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "hohRosterId" VARCHAR(64),
    "nominee1RosterId" VARCHAR(64),
    "nominee2RosterId" VARCHAR(64),
    "vetoWinnerRosterId" VARCHAR(64),
    "vetoParticipantRosterIds" JSONB,
    "vetoUsed" BOOLEAN NOT NULL DEFAULT false,
    "vetoSavedRosterId" VARCHAR(64),
    "replacementNomineeRosterId" VARCHAR(64),
    "evictedRosterId" VARCHAR(64),
    "voteDeadlineAt" TIMESTAMP(3),
    "voteOpenedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "tieBreakSeasonPoints" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "big_brother_cycles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "big_brother_cycles_configId_week_key" ON "big_brother_cycles"("configId", "week");
CREATE INDEX "big_brother_cycles_leagueId_week_idx" ON "big_brother_cycles"("leagueId", "week");

CREATE TABLE "big_brother_eviction_votes" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "voterRosterId" VARCHAR(64) NOT NULL,
    "targetRosterId" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "big_brother_eviction_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "big_brother_eviction_votes_cycleId_voterRosterId_key" ON "big_brother_eviction_votes"("cycleId", "voterRosterId");
CREATE INDEX "big_brother_eviction_votes_cycleId_idx" ON "big_brother_eviction_votes"("cycleId");

CREATE TABLE "big_brother_jury_members" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "evictedWeek" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "big_brother_jury_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "big_brother_jury_members_leagueId_rosterId_key" ON "big_brother_jury_members"("leagueId", "rosterId");
CREATE INDEX "big_brother_jury_members_leagueId_idx" ON "big_brother_jury_members"("leagueId");

CREATE TABLE "big_brother_finale_votes" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "juryRosterId" VARCHAR(64) NOT NULL,
    "targetRosterId" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "big_brother_finale_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "big_brother_finale_votes_leagueId_juryRosterId_key" ON "big_brother_finale_votes"("leagueId", "juryRosterId");
CREATE INDEX "big_brother_finale_votes_leagueId_idx" ON "big_brother_finale_votes"("leagueId");

CREATE TABLE "big_brother_audit_logs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "big_brother_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "big_brother_audit_logs_leagueId_eventType_idx" ON "big_brother_audit_logs"("leagueId", "eventType");
CREATE INDEX "big_brother_audit_logs_createdAt_idx" ON "big_brother_audit_logs"("createdAt");

ALTER TABLE "big_brother_league_configs" ADD CONSTRAINT "big_brother_league_configs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "big_brother_cycles" ADD CONSTRAINT "big_brother_cycles_configId_fkey" FOREIGN KEY ("configId") REFERENCES "big_brother_league_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "big_brother_eviction_votes" ADD CONSTRAINT "big_brother_eviction_votes_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "big_brother_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "big_brother_jury_members" ADD CONSTRAINT "big_brother_jury_members_configId_fkey" FOREIGN KEY ("configId") REFERENCES "big_brother_league_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "big_brother_audit_logs" ADD CONSTRAINT "big_brother_audit_logs_configId_fkey" FOREIGN KEY ("configId") REFERENCES "big_brother_league_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
