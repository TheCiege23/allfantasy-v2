-- AI Auto Start/Sit Protection: user prefs + enriched swap audit
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "auto_coach_preferences" JSONB;

ALTER TABLE "auto_coach_swap_logs" ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION;
ALTER TABLE "auto_coach_swap_logs" ADD COLUMN IF NOT EXISTS "expected_points_delta" DOUBLE PRECISION;
ALTER TABLE "auto_coach_swap_logs" ADD COLUMN IF NOT EXISTS "decision_engine" TEXT DEFAULT 'start_sit_projection_v1';
ALTER TABLE "auto_coach_swap_logs" ADD COLUMN IF NOT EXISTS "preference_influenced" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "auto_coach_swap_logs" ADD COLUMN IF NOT EXISTS "status_freshness_at" TIMESTAMP(3);
ALTER TABLE "auto_coach_swap_logs" ADD COLUMN IF NOT EXISTS "server_decided_at" TIMESTAMP(3);
ALTER TABLE "auto_coach_swap_logs" ADD COLUMN IF NOT EXISTS "decision_notes" TEXT;
