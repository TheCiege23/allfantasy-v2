-- Phase 1 automation foundation tables (Neon Postgres).

CREATE TABLE "automation_jobs" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT,
    "userId" TEXT,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "idempotencyKey" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "automation_jobs_idempotencyKey_key" ON "automation_jobs"("idempotencyKey");

CREATE INDEX "automation_jobs_jobType_idx" ON "automation_jobs"("jobType");
CREATE INDEX "automation_jobs_status_idx" ON "automation_jobs"("status");
CREATE INDEX "automation_jobs_leagueId_idx" ON "automation_jobs"("leagueId");
CREATE INDEX "automation_jobs_scheduledFor_idx" ON "automation_jobs"("scheduledFor");
CREATE INDEX "automation_jobs_createdAt_idx" ON "automation_jobs"("createdAt");

CREATE TABLE "automation_runs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "leagueId" TEXT,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_runs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "automation_runs"
ADD CONSTRAINT "automation_runs_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "automation_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "automation_runs_jobType_idx" ON "automation_runs"("jobType");
CREATE INDEX "automation_runs_status_idx" ON "automation_runs"("status");
CREATE INDEX "automation_runs_leagueId_idx" ON "automation_runs"("leagueId");
CREATE INDEX "automation_runs_createdAt_idx" ON "automation_runs"("createdAt");

CREATE TABLE "automation_audit_logs" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT,
    "userId" TEXT,
    "jobId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "automation_audit_logs_leagueId_idx" ON "automation_audit_logs"("leagueId");
CREATE INDEX "automation_audit_logs_userId_idx" ON "automation_audit_logs"("userId");
CREATE INDEX "automation_audit_logs_action_idx" ON "automation_audit_logs"("action");
CREATE INDEX "automation_audit_logs_createdAt_idx" ON "automation_audit_logs"("createdAt");

CREATE TABLE "notification_outbox" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT,
    "userId" TEXT,
    "channel" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sendAfter" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_outbox_status_idx" ON "notification_outbox"("status");
CREATE INDEX "notification_outbox_channel_idx" ON "notification_outbox"("channel");
CREATE INDEX "notification_outbox_eventType_idx" ON "notification_outbox"("eventType");
CREATE INDEX "notification_outbox_sendAfter_idx" ON "notification_outbox"("sendAfter");
CREATE INDEX "notification_outbox_createdAt_idx" ON "notification_outbox"("createdAt");

CREATE TABLE "realtime_events" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "realtime_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "realtime_events_leagueId_idx" ON "realtime_events"("leagueId");
CREATE INDEX "realtime_events_userId_idx" ON "realtime_events"("userId");
CREATE INDEX "realtime_events_eventType_idx" ON "realtime_events"("eventType");
CREATE INDEX "realtime_events_createdAt_idx" ON "realtime_events"("createdAt");

CREATE TABLE "automation_locks" (
    "id" TEXT NOT NULL,
    "lockKey" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_locks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "automation_locks_lockKey_key" ON "automation_locks"("lockKey");

CREATE INDEX "automation_locks_lockKey_idx" ON "automation_locks"("lockKey");
CREATE INDEX "automation_locks_expiresAt_idx" ON "automation_locks"("expiresAt");
