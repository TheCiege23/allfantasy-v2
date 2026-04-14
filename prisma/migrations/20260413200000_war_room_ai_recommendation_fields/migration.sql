ALTER TABLE "ai_recommendation_logs" ADD COLUMN IF NOT EXISTS "recommendationType" VARCHAR(32);
ALTER TABLE "ai_recommendation_logs" ADD COLUMN IF NOT EXISTS "confidencePct" DOUBLE PRECISION;
ALTER TABLE "ai_recommendation_logs" ADD COLUMN IF NOT EXISTS "accepted" BOOLEAN;
