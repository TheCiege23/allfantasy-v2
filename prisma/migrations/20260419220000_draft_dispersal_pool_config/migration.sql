-- Dispersal / specialty draft pool rules (eligible teams, protected assets, asset types).
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "dispersalPoolConfig" JSONB;
