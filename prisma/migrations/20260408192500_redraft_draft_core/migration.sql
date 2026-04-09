-- REDRAFT draft engine core tables
-- Scope: draft lifecycle, picks, manager queue, and draft event stream.

CREATE TABLE IF NOT EXISTS "redraft_drafts" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "sport" "LeagueSport" NOT NULL,
    "draftType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "timerSeconds" INTEGER NOT NULL DEFAULT 60,
    "pickTimeoutPolicy" TEXT NOT NULL DEFAULT 'autopick',
    "totalRounds" INTEGER NOT NULL,
    "totalPicks" INTEGER NOT NULL,
    "orderStrategy" TEXT NOT NULL DEFAULT 'random',
    "randomSeed" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redraft_drafts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "redraft_drafts_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_drafts_league_season_key" UNIQUE ("leagueId", "season"),
    CONSTRAINT "redraft_drafts_draft_type_check" CHECK ("draftType" IN ('snake', 'auction', 'linear')),
    CONSTRAINT "redraft_drafts_status_check" CHECK ("status" IN ('scheduled', 'live', 'paused', 'completed', 'cancelled')),
    CONSTRAINT "redraft_drafts_timer_check" CHECK ("timerSeconds" > 0),
    CONSTRAINT "redraft_drafts_rounds_check" CHECK ("totalRounds" > 0),
    CONSTRAINT "redraft_drafts_picks_check" CHECK ("totalPicks" > 0)
);

CREATE INDEX IF NOT EXISTS "redraft_drafts_league_status_idx" ON "redraft_drafts"("leagueId", "status");
CREATE INDEX IF NOT EXISTS "redraft_drafts_status_sched_idx" ON "redraft_drafts"("status", "scheduledAt");

CREATE TABLE IF NOT EXISTS "redraft_draft_picks" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "pickNumber" INTEGER NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "rosterId" TEXT,
    "selectedPlayerId" TEXT,
    "selectedPlayerName" TEXT,
    "selectedPosition" TEXT,
    "selectedTeam" TEXT,
    "selectionSource" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "pickDeadlineAt" TIMESTAMP(3),
    "pickedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redraft_draft_picks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "redraft_draft_picks_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "redraft_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_draft_picks_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_draft_picks_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "rosters"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "redraft_draft_picks_pick_unique" UNIQUE ("draftId", "pickNumber"),
    CONSTRAINT "redraft_draft_picks_round_slot_unique" UNIQUE ("draftId", "round", "slotNumber"),
    CONSTRAINT "redraft_draft_picks_round_check" CHECK ("round" > 0),
    CONSTRAINT "redraft_draft_picks_pick_number_check" CHECK ("pickNumber" > 0),
    CONSTRAINT "redraft_draft_picks_slot_check" CHECK ("slotNumber" > 0),
    CONSTRAINT "redraft_draft_picks_status_check" CHECK ("status" IN ('pending', 'made', 'skipped', 'forfeited')),
    CONSTRAINT "redraft_draft_picks_source_check" CHECK ("selectionSource" IS NULL OR "selectionSource" IN ('manual', 'queue', 'autopick', 'commissioner'))
);

CREATE INDEX IF NOT EXISTS "redraft_draft_picks_draft_idx" ON "redraft_draft_picks"("draftId", "pickNumber");
CREATE INDEX IF NOT EXISTS "redraft_draft_picks_league_status_idx" ON "redraft_draft_picks"("leagueId", "status");
CREATE INDEX IF NOT EXISTS "redraft_draft_picks_roster_idx" ON "redraft_draft_picks"("rosterId");

CREATE TABLE IF NOT EXISTS "redraft_draft_queue" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT,
    "position" TEXT,
    "team" TEXT,
    "isConsumed" BOOLEAN NOT NULL DEFAULT false,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redraft_draft_queue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "redraft_draft_queue_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "redraft_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_draft_queue_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_draft_queue_unique_player" UNIQUE ("draftId", "rosterId", "playerId"),
    CONSTRAINT "redraft_draft_queue_unique_rank" UNIQUE ("draftId", "rosterId", "rank"),
    CONSTRAINT "redraft_draft_queue_rank_check" CHECK ("rank" > 0)
);

CREATE INDEX IF NOT EXISTS "redraft_draft_queue_lookup_idx" ON "redraft_draft_queue"("draftId", "rosterId", "rank");
CREATE INDEX IF NOT EXISTS "redraft_draft_queue_state_idx" ON "redraft_draft_queue"("draftId", "isConsumed", "rank");

CREATE TABLE IF NOT EXISTS "redraft_draft_events" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "idempotencyKey" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redraft_draft_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "redraft_draft_events_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "redraft_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_draft_events_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "redraft_draft_events_draft_time_idx" ON "redraft_draft_events"("draftId", "createdAt");
CREATE INDEX IF NOT EXISTS "redraft_draft_events_league_time_idx" ON "redraft_draft_events"("leagueId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "redraft_draft_events_idempotency_idx" ON "redraft_draft_events"("draftId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
