-- Add devy draft config to DraftSession (PROMPT 191).
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "devyConfig" JSONB;
