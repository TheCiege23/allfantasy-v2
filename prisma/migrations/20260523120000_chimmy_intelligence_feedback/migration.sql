-- Phase 5 — Chimmy intelligence internal QA feedback + UX instrumentation.
-- Append-only fire-and-forget log. Same shape philosophy as chimmy_context_runs:
-- no FK on userId/leagueId, PII-safe (ids and short enums only).

CREATE TABLE "chimmy_intelligence_feedback" (
    "id"          TEXT          NOT NULL,
    "userId"      VARCHAR(64)   NOT NULL,
    "leagueId"    VARCHAR(64),
    -- Event taxonomy:
    --   feedback:  "thumbs_up" | "thumbs_down"
    --   interaction: "expand" | "collapse" | "dismiss" | "view"
    "eventType"   VARCHAR(24)   NOT NULL,
    -- DashboardIntelligenceCard.id (e.g. "urgency", "top_risks").
    "cardId"      VARCHAR(48),
    -- DashboardSeverity snapshot: "critical" | "high" | "moderate" | "low" | "info".
    "severity"    VARCHAR(16),
    -- Optional reason taxonomy for thumbs_down:
    --   "not_useful" | "incorrect" | "too_repetitive" | "other"
    "reason"      VARCHAR(24),
    -- Optional surface where the event occurred (rail, debug, future surfaces).
    "surface"     VARCHAR(32)   NOT NULL DEFAULT 'rail',
    -- Origin canary cohort label captured at event time for trend slicing.
    "cohortLabel" VARCHAR(24),
    "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chimmy_intelligence_feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chimmy_intel_feedback_userId_createdAt_idx"  ON "chimmy_intelligence_feedback"("userId", "createdAt");
CREATE INDEX "chimmy_intel_feedback_leagueId_createdAt_idx" ON "chimmy_intelligence_feedback"("leagueId", "createdAt");
CREATE INDEX "chimmy_intel_feedback_event_card_idx"        ON "chimmy_intelligence_feedback"("eventType", "cardId", "createdAt");
CREATE INDEX "chimmy_intel_feedback_createdAt_idx"         ON "chimmy_intelligence_feedback"("createdAt");
