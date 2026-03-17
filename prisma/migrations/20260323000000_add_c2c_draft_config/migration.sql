-- Add C2C draft config to DraftSession (PROMPT 192).
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "c2cConfig" JSONB;
