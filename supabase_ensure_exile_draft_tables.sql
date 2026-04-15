CREATE TABLE IF NOT EXISTS exile_team_claims (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  league_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  real_player_id TEXT NOT NULL,
  week INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
-- Idempotent: existing installs get the column filled in.
ALTER TABLE exile_team_claims ADD COLUMN IF NOT EXISTS week INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_exile_claims_league ON exile_team_claims(league_id, status);
CREATE INDEX IF NOT EXISTS idx_exile_claims_league_week ON exile_team_claims(league_id, week);

CREATE TABLE IF NOT EXISTS exile_team_rosters (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  league_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  real_team_id TEXT NOT NULL,
  real_player_ids TEXT[] NOT NULL DEFAULT '{}',
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exile_rosters_unique ON exile_team_rosters(league_id, user_id, real_team_id);
