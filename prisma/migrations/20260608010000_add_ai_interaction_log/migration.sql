-- CreateTable: ai_interaction_logs
-- Append-only audit log for every AI interaction across all sports.
-- One row per LLM call (or deterministic bypass). Never mutate rows.

CREATE TABLE "ai_interaction_logs" (
    "id"               VARCHAR(30) NOT NULL,
    "userId"           VARCHAR(64),
    "sport"            VARCHAR(32) NOT NULL,
    "feature"          VARCHAR(64) NOT NULL,
    "route"            VARCHAR(128),
    "plan"             VARCHAR(32),
    "providerSource"   VARCHAR(32),
    "freshnessTier"    VARCHAR(32),
    "promptIntent"     VARCHAR(64),
    "missingData"      TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
    "allowedClaims"    TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
    "validatorResult"  VARCHAR(32),
    "blockedReason"    VARCHAR(64),
    "modelUsed"        VARCHAR(64),
    "tokenCost"        INTEGER,
    "wasDeterministic" BOOLEAN     NOT NULL DEFAULT false,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_interaction_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_interaction_logs_userId_createdAt_idx"
    ON "ai_interaction_logs"("userId", "createdAt");

CREATE INDEX "ai_interaction_logs_sport_feature_createdAt_idx"
    ON "ai_interaction_logs"("sport", "feature", "createdAt");

CREATE INDEX "ai_interaction_logs_validatorResult_idx"
    ON "ai_interaction_logs"("validatorResult");

CREATE INDEX "ai_interaction_logs_providerSource_createdAt_idx"
    ON "ai_interaction_logs"("providerSource", "createdAt");

CREATE INDEX "ai_interaction_logs_createdAt_idx"
    ON "ai_interaction_logs"("createdAt");
