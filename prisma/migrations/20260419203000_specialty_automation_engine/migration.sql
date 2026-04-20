-- Specialty League Automation Engine: runs, actions, events, phase state

CREATE TABLE "specialty_automation_runs" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "concept" VARCHAR(64) NOT NULL,
    "triggerType" VARCHAR(64) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'pending',
    "idempotencyKey" VARCHAR(256) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "summary" TEXT,
    "metadata" JSONB,
    "error" TEXT,

    CONSTRAINT "specialty_automation_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "specialty_automation_runs_idempotencyKey_key" ON "specialty_automation_runs"("idempotencyKey");
CREATE INDEX "specialty_automation_runs_leagueId_startedAt_idx" ON "specialty_automation_runs"("leagueId", "startedAt");
CREATE INDEX "specialty_automation_runs_leagueId_concept_triggerType_idx" ON "specialty_automation_runs"("leagueId", "concept", "triggerType");

ALTER TABLE "specialty_automation_runs" ADD CONSTRAINT "specialty_automation_runs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "specialty_automation_actions" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "actionType" VARCHAR(64) NOT NULL,
    "targetType" VARCHAR(32),
    "targetId" VARCHAR(128),
    "status" VARCHAR(24) NOT NULL DEFAULT 'pending',
    "executedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "specialty_automation_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "specialty_automation_actions_leagueId_idx" ON "specialty_automation_actions"("leagueId");
CREATE INDEX "specialty_automation_actions_runId_idx" ON "specialty_automation_actions"("runId");

ALTER TABLE "specialty_automation_actions" ADD CONSTRAINT "specialty_automation_actions_runId_fkey" FOREIGN KEY ("runId") REFERENCES "specialty_automation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "specialty_automation_actions" ADD CONSTRAINT "specialty_automation_actions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "league_events" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "title" VARCHAR(256) NOT NULL,
    "description" TEXT,
    "payload" JSONB,
    "visibility" VARCHAR(24) NOT NULL DEFAULT 'league',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "league_events_leagueId_createdAt_idx" ON "league_events"("leagueId", "createdAt");
CREATE INDEX "league_events_eventType_idx" ON "league_events"("eventType");

ALTER TABLE "league_events" ADD CONSTRAINT "league_events_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "specialty_phase_state" (
    "leagueId" TEXT NOT NULL,
    "currentPhase" VARCHAR(64),
    "currentStage" VARCHAR(64),
    "currentWeekContext" INTEGER,
    "pendingActionCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialty_phase_state_pkey" PRIMARY KEY ("leagueId")
);

ALTER TABLE "specialty_phase_state" ADD CONSTRAINT "specialty_phase_state_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
