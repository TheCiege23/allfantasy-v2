-- PROMPT 149: Onboarding and retention — persist dismissed nudge IDs and timestamps
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "retentionNudgeDismissedAt" JSONB;
