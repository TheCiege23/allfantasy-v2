-- Sleeper commissioner flags on League + LeagueTeam (co-commissioner is AF-only)

ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "isCommissioner" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "league_teams" ADD COLUMN IF NOT EXISTS "isCommissioner" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "league_teams" ADD COLUMN IF NOT EXISTS "isCoCommissioner" BOOLEAN NOT NULL DEFAULT false;
