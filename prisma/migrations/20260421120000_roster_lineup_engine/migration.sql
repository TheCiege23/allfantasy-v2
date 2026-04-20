-- Canonical roster lineup assignments, move history, and lock state cache

CREATE TABLE "af_roster_lineup_assignments" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "section" VARCHAR(16) NOT NULL,
    "slotIndex" INTEGER NOT NULL DEFAULT 0,
    "playerId" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "af_roster_lineup_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "af_roster_lineup_assignments_rosterId_season_week_playerId_key" ON "af_roster_lineup_assignments"("rosterId", "season", "week", "playerId");

CREATE INDEX "af_roster_lineup_assignments_leagueId_season_week_idx" ON "af_roster_lineup_assignments"("leagueId", "season", "week");

CREATE INDEX "af_roster_lineup_assignments_rosterId_season_week_idx" ON "af_roster_lineup_assignments"("rosterId", "season", "week");

ALTER TABLE "af_roster_lineup_assignments" ADD CONSTRAINT "af_roster_lineup_assignments_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "af_roster_lineup_assignments" ADD CONSTRAINT "af_roster_lineup_assignments_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "af_roster_move_history" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "actorUserId" VARCHAR(128),
    "source" VARCHAR(32) NOT NULL,
    "moveSummary" VARCHAR(512),
    "beforeHash" VARCHAR(64),
    "afterHash" VARCHAR(64),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "af_roster_move_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "af_roster_move_history_leagueId_rosterId_createdAt_idx" ON "af_roster_move_history"("leagueId", "rosterId", "createdAt");

CREATE INDEX "af_roster_move_history_leagueId_season_week_idx" ON "af_roster_move_history"("leagueId", "season", "week");

ALTER TABLE "af_roster_move_history" ADD CONSTRAINT "af_roster_move_history_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "af_roster_move_history" ADD CONSTRAINT "af_roster_move_history_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "af_lineup_lock_state" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "globalLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedPlayerIds" JSONB,
    "policy" VARCHAR(64),
    "reason" VARCHAR(512),
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "af_lineup_lock_state_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "af_lineup_lock_state_rosterId_season_week_key" ON "af_lineup_lock_state"("rosterId", "season", "week");

CREATE INDEX "af_lineup_lock_state_leagueId_season_week_idx" ON "af_lineup_lock_state"("leagueId", "season", "week");

ALTER TABLE "af_lineup_lock_state" ADD CONSTRAINT "af_lineup_lock_state_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "af_lineup_lock_state" ADD CONSTRAINT "af_lineup_lock_state_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
