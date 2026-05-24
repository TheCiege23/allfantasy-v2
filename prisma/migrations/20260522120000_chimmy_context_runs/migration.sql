-- Phase 3A.2 Batch 2 — Chimmy context engine telemetry.
-- Append-only fire-and-forget log of every Chimmy intelligence/context run.
-- No FK on userId/leagueId so cleanup is fully decoupled from the engine
-- and writes never cascade-block. PII-safe: stores ids only.

CREATE TABLE "chimmy_context_runs" (
    "id"                     TEXT          NOT NULL,
    "userId"                 VARCHAR(64)   NOT NULL,
    "leagueId"               VARCHAR(64),
    "surface"                VARCHAR(32)   NOT NULL,
    "intent"                 VARCHAR(48),
    "canaryReason"           VARCHAR(16),
    "rolloutBucket"          INTEGER,
    "durationMs"             INTEGER       NOT NULL,
    "approxPromptChars"      INTEGER,
    "urgencyLevel"           VARCHAR(16),
    "recommendationSeverity" VARCHAR(16),
    "riskComposite"          INTEGER,
    "topRisk"                VARCHAR(16),
    "cacheHitCount"          INTEGER       NOT NULL DEFAULT 0,
    "providerFailureCount"   INTEGER       NOT NULL DEFAULT 0,
    "providerMeta"           JSONB,
    "sectionMeta"            JSONB,
    "errorMessage"           VARCHAR(256),
    "createdAt"              TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chimmy_context_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chimmy_context_runs_userId_createdAt_idx"       ON "chimmy_context_runs"("userId", "createdAt");
CREATE INDEX "chimmy_context_runs_leagueId_createdAt_idx"     ON "chimmy_context_runs"("leagueId", "createdAt");
CREATE INDEX "chimmy_context_runs_surface_createdAt_idx"      ON "chimmy_context_runs"("surface", "createdAt");
CREATE INDEX "chimmy_context_runs_urgencyLevel_createdAt_idx" ON "chimmy_context_runs"("urgencyLevel", "createdAt");
CREATE INDEX "chimmy_context_runs_createdAt_idx"              ON "chimmy_context_runs"("createdAt");
