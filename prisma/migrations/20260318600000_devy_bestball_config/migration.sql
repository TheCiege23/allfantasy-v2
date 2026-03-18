-- PROMPT 4: Devy best ball config (taxi scoring toggle, superflex).
ALTER TABLE "devy_league_configs"
  ADD COLUMN IF NOT EXISTS "taxiProRookiesScoreInBestBall" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "bestBallSuperflex" BOOLEAN NOT NULL DEFAULT false;
