-- CreateTable: ai_feedback
-- Stores per-user thumbs-up / thumbs-down feedback on AI answers.
-- Keyed by (userId, feature, resultKey) with an upsert pattern so a user
-- can change their rating without creating duplicate rows.

CREATE TABLE "ai_feedback" (
    "id"          TEXT NOT NULL,
    "userId"      VARCHAR(64) NOT NULL,
    "feature"     VARCHAR(64) NOT NULL,
    "resultKey"   VARCHAR(255),
    "rating"      VARCHAR(32) NOT NULL,
    "promptHash"  VARCHAR(32),
    "sport"       VARCHAR(32),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_feedback_pkey" PRIMARY KEY ("id")
);

-- UniqueConstraint: one feedback row per user×feature×resultKey
CREATE UNIQUE INDEX "ai_feedback_userId_feature_resultKey_key"
    ON "ai_feedback"("userId", "feature", "resultKey");

-- Index: analytics — rating distribution by feature over time
CREATE INDEX "ai_feedback_feature_rating_createdAt_idx"
    ON "ai_feedback"("feature", "rating", "createdAt");

-- Index: user history lookup
CREATE INDEX "ai_feedback_userId_createdAt_idx"
    ON "ai_feedback"("userId", "createdAt");

-- Index: join to AiResult by resultKey
CREATE INDEX "ai_feedback_resultKey_idx"
    ON "ai_feedback"("resultKey");
