-- ============================================================
-- Unified Saved AI Recommendations
-- AllFantasy — Chimmy persistent strategy assistant
-- ============================================================

-- Drop old table if it existed in a previous partial migration
-- (The legacy ai_saved_recommendations used a narrower schema)

-- NOTE: If ai_saved_recommendations already exists from a previous
-- migration with the narrow schema, run the ALTER TABLE block below
-- instead of the CREATE TABLE block.

-- ─── Main table ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_recommendations (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id               TEXT NOT NULL,
  league_id             TEXT,
  sport                 TEXT NOT NULL DEFAULT 'all',
  league_type           TEXT NOT NULL DEFAULT 'all',
  title                 TEXT NOT NULL,
  summary               TEXT NOT NULL DEFAULT '',
  recommendation_type   TEXT NOT NULL DEFAULT 'general',
  recommendation_payload JSONB NOT NULL DEFAULT '{}',
  explanation           TEXT NOT NULL DEFAULT '',
  confidence            REAL NOT NULL DEFAULT 0.0,
  risk_level            TEXT,
  actions               JSONB NOT NULL DEFAULT '[]',
  source_surface        TEXT NOT NULL DEFAULT 'unknown',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ,
  is_archived           BOOLEAN NOT NULL DEFAULT FALSE,
  status                TEXT NOT NULL DEFAULT 'saved',
  is_commissioner_rec   BOOLEAN NOT NULL DEFAULT FALSE,
  payload_hash          TEXT,

  CONSTRAINT saved_recommendations_status_check
    CHECK (status IN ('saved', 'acted_on', 'dismissed', 'stale')),

  CONSTRAINT saved_recommendations_risk_check
    CHECK (risk_level IS NULL OR risk_level IN ('low', 'medium', 'high', 'critical'))
);

-- ─── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_saved_recs_user
  ON saved_recommendations (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_recs_user_league
  ON saved_recommendations (user_id, league_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_recs_user_status
  ON saved_recommendations (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_recs_user_sport
  ON saved_recommendations (user_id, sport, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_recs_user_type
  ON saved_recommendations (user_id, recommendation_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_recs_expiry
  ON saved_recommendations (expires_at)
  WHERE expires_at IS NOT NULL;

-- ─── Auto-update updated_at ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_saved_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_saved_recs_updated_at ON saved_recommendations;
CREATE TRIGGER trg_saved_recs_updated_at
  BEFORE UPDATE ON saved_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_saved_recommendations_updated_at();

-- ─── Row Level Security ─────────────────────────────────────────────────────────

ALTER TABLE saved_recommendations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own saved recommendations
CREATE POLICY "saved_recs_select_own"
  ON saved_recommendations FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can insert their own
CREATE POLICY "saved_recs_insert_own"
  ON saved_recommendations FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can update/archive their own
CREATE POLICY "saved_recs_update_own"
  ON saved_recommendations FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Users can delete their own
CREATE POLICY "saved_recs_delete_own"
  ON saved_recommendations FOR DELETE
  USING (auth.uid()::text = user_id);

-- ─── Stale-mark helper ─────────────────────────────────────────────────────────
-- A lightweight function that marks saved recs as stale when their
-- expires_at has passed but they are still "saved". Call via cron or on read.

CREATE OR REPLACE FUNCTION mark_stale_saved_recommendations()
RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE saved_recommendations
  SET status = 'stale', updated_at = NOW()
  WHERE status = 'saved'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Legacy table: add hash column if upgrading ─────────────────────────────────
-- If ai_saved_recommendations still exists and has data, run this to bridge it
-- (safe to skip if table was never created):
--
-- ALTER TABLE ai_saved_recommendations ADD COLUMN IF NOT EXISTS payload_hash TEXT;
-- INSERT INTO saved_recommendations (id, user_id, league_id, sport, league_type,
--   title, summary, recommendation_type, recommendation_payload, explanation,
--   confidence, actions, source_surface, created_at, status, is_archived)
-- SELECT
--   id,
--   user_id,
--   league_id,
--   sport,
--   league_type,
--   LEFT(recommendation_text, 120) AS title,
--   recommendation_text AS summary,
--   'general' AS recommendation_type,
--   to_jsonb(action) AS recommendation_payload,
--   recommendation_text AS explanation,
--   0.0 AS confidence,
--   jsonb_build_array(action) AS actions,
--   surface AS source_surface,
--   saved_at AS created_at,
--   CASE WHEN acted_on THEN 'acted_on' ELSE 'saved' END AS status,
--   FALSE AS is_archived
-- FROM ai_saved_recommendations
-- ON CONFLICT (id) DO NOTHING;
