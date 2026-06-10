-- Migration: add_ai_feedback_reason
-- Adds an optional reason column to ai_feedback so the "not_helpful" chip
-- selection is persisted to the DB (not just sent as an analytics beacon).
--
-- Values: "too_basic" | "not_actionable" | "wrong_data" | "great_insight" | NULL
-- NULL means the user clicked "helpful" or "not helpful" without selecting a chip.
--
-- Backward-compatible: existing rows get NULL (no reason recorded).

ALTER TABLE "ai_feedback"
    ADD COLUMN IF NOT EXISTS "reason" VARCHAR(32);

-- Index to power admin queries like:
--   "How many 'too_basic' complaints for world_cup_daily_edge_report this week?"
CREATE INDEX IF NOT EXISTS "ai_feedback_feature_reason_createdAt_idx"
    ON "ai_feedback"("feature", "reason", "createdAt");
