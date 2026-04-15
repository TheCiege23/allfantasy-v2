CREATE TABLE IF NOT EXISTS league_manager_profiles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  league_id TEXT NOT NULL,
  manager_id TEXT NOT NULL,
  manager_name TEXT,
  manager_avatar TEXT,
  total_seasons INTEGER NOT NULL DEFAULT 0,
  total_wins INTEGER NOT NULL DEFAULT 0,
  total_losses INTEGER NOT NULL DEFAULT 0,
  total_ties INTEGER NOT NULL DEFAULT 0,
  total_points_for NUMERIC NOT NULL DEFAULT 0,
  championships INTEGER NOT NULL DEFAULT 0,
  playoff_appearances INTEGER NOT NULL DEFAULT 0,
  avg_finish NUMERIC,
  draft_style JSONB NOT NULL DEFAULT '{}'::jsonb,
  trade_frequency NUMERIC,
  favorite_positions JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mgr_profiles_unique ON league_manager_profiles(league_id, manager_id);
