-- Import normalization: runs, warnings, external mappings, review tasks

CREATE TABLE "import_runs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT,
    "provider" VARCHAR(32) NOT NULL,
    "sourceLeagueId" VARCHAR(128) NOT NULL,
    "season" INTEGER NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'running',
    "idempotencyKey" VARCHAR(256) NOT NULL,
    "rawPayloadHash" VARCHAR(64),
    "canonicalSummary" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "import_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "import_runs_idempotencyKey_key" ON "import_runs"("idempotencyKey");
CREATE INDEX "import_runs_userId_startedAt_idx" ON "import_runs"("userId", "startedAt");
CREATE INDEX "import_runs_provider_sourceLeagueId_season_idx" ON "import_runs"("provider", "sourceLeagueId", "season");

ALTER TABLE "import_runs" ADD CONSTRAINT "import_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_runs" ADD CONSTRAINT "import_runs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "import_warnings" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "leagueId" TEXT,
    "code" VARCHAR(64) NOT NULL,
    "message" TEXT NOT NULL,
    "severity" VARCHAR(16) NOT NULL DEFAULT 'info',
    "metadata" JSONB,

    CONSTRAINT "import_warnings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "import_warnings_runId_idx" ON "import_warnings"("runId");

ALTER TABLE "import_warnings" ADD CONSTRAINT "import_warnings_runId_fkey" FOREIGN KEY ("runId") REFERENCES "import_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "external_entity_mappings" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "runId" TEXT,
    "provider" VARCHAR(32) NOT NULL,
    "entityType" VARCHAR(32) NOT NULL,
    "sourceId" VARCHAR(128) NOT NULL,
    "internalId" VARCHAR(128),
    "confidence" DOUBLE PRECISION,
    "metadata" JSONB,

    CONSTRAINT "external_entity_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_entity_mappings_leagueId_provider_entityType_sourceId_key" ON "external_entity_mappings"("leagueId", "provider", "entityType", "sourceId");
CREATE INDEX "external_entity_mappings_runId_idx" ON "external_entity_mappings"("runId");

ALTER TABLE "external_entity_mappings" ADD CONSTRAINT "external_entity_mappings_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_entity_mappings" ADD CONSTRAINT "external_entity_mappings_runId_fkey" FOREIGN KEY ("runId") REFERENCES "import_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "import_review_tasks" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "runId" TEXT,
    "taskType" VARCHAR(64) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'open',
    "payload" JSONB,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "import_review_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "import_review_tasks_leagueId_status_idx" ON "import_review_tasks"("leagueId", "status");

ALTER TABLE "import_review_tasks" ADD CONSTRAINT "import_review_tasks_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_review_tasks" ADD CONSTRAINT "import_review_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_review_tasks" ADD CONSTRAINT "import_review_tasks_runId_fkey" FOREIGN KEY ("runId") REFERENCES "import_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
