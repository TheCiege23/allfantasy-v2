-- AllFantasy AI intelligence layer (same DDL as supabase/sql/ai_intelligence_schema.sql)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS ai_platform_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT,
  league_id TEXT,
  season INTEGER,
  sport TEXT,
  league_type TEXT,
  draft_type TEXT,
  scoring_profile TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_platform_events_dedupe_key_key
  ON ai_platform_events (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ai_platform_events_event_type_idx ON ai_platform_events (event_type);
CREATE INDEX IF NOT EXISTS ai_platform_events_user_id_idx ON ai_platform_events (user_id);
CREATE INDEX IF NOT EXISTS ai_platform_events_league_id_idx ON ai_platform_events (league_id);
CREATE INDEX IF NOT EXISTS ai_platform_events_created_at_idx ON ai_platform_events (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_platform_events_sport_season_idx ON ai_platform_events (sport, season);

CREATE TABLE IF NOT EXISTS ai_player_market_metrics (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  sport TEXT NOT NULL,
  season INTEGER NOT NULL,
  adp_avg DOUBLE PRECISION,
  adp_trend_7d DOUBLE PRECISION,
  adp_trend_30d DOUBLE PRECISION,
  draft_count INTEGER NOT NULL DEFAULT 0,
  waiver_add_count INTEGER NOT NULL DEFAULT 0,
  waiver_bid_avg DOUBLE PRECISION,
  trade_inclusion_count INTEGER NOT NULL DEFAULT 0,
  trade_accept_rate DOUBLE PRECISION,
  drop_rate DOUBLE PRECISION,
  roster_rate DOUBLE PRECISION,
  start_rate DOUBLE PRECISION,
  bench_rate DOUBLE PRECISION,
  volatility_score DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_player_market_metrics_player_sport_season_key
  ON ai_player_market_metrics (player_id, sport, season);
CREATE INDEX IF NOT EXISTS ai_player_market_metrics_sport_season_idx ON ai_player_market_metrics (sport, season);

CREATE TABLE IF NOT EXISTS ai_league_type_metrics (
  id TEXT PRIMARY KEY,
  sport TEXT NOT NULL,
  league_type TEXT NOT NULL,
  scoring_profile TEXT NOT NULL DEFAULT '',
  position_value_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  rookie_value_weight DOUBLE PRECISION,
  pick_value_curve JSONB NOT NULL DEFAULT '{}'::jsonb,
  waiver_aggression_score DOUBLE PRECISION,
  trade_aggression_score DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_league_type_metrics_sport_league_scoring_key
  ON ai_league_type_metrics (sport, league_type, scoring_profile);
CREATE INDEX IF NOT EXISTS ai_league_type_metrics_sport_idx ON ai_league_type_metrics (sport);

CREATE TABLE IF NOT EXISTS ai_user_tendencies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sport TEXT NOT NULL DEFAULT '',
  preferred_positions JSONB NOT NULL DEFAULT '{}'::jsonb,
  early_round_behavior JSONB NOT NULL DEFAULT '{}'::jsonb,
  rookie_bias_score DOUBLE PRECISION,
  risk_tolerance_score DOUBLE PRECISION,
  trade_aggression_score DOUBLE PRECISION,
  waiver_activity_score DOUBLE PRECISION,
  qb_wait_score DOUBLE PRECISION,
  rb_heavy_score DOUBLE PRECISION,
  wr_heavy_score DOUBLE PRECISION,
  zero_rb_score DOUBLE PRECISION,
  hero_rb_score DOUBLE PRECISION,
  ai_follow_rate DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_user_tendencies_user_sport_key
  ON ai_user_tendencies (user_id, sport);
CREATE INDEX IF NOT EXISTS ai_user_tendencies_user_id_idx ON ai_user_tendencies (user_id);

CREATE TABLE IF NOT EXISTS ai_recommendation_outcomes (
  id TEXT PRIMARY KEY,
  recommendation_id TEXT NOT NULL,
  type TEXT NOT NULL,
  user_id TEXT,
  league_id TEXT,
  recommendation_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  followed BOOLEAN,
  outcome_score DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ai_recommendation_outcomes_rec_id_idx ON ai_recommendation_outcomes (recommendation_id);
CREATE INDEX IF NOT EXISTS ai_recommendation_outcomes_user_idx ON ai_recommendation_outcomes (user_id);
CREATE INDEX IF NOT EXISTS ai_recommendation_outcomes_league_idx ON ai_recommendation_outcomes (league_id);
CREATE INDEX IF NOT EXISTS ai_recommendation_outcomes_type_idx ON ai_recommendation_outcomes (type);

CREATE TABLE IF NOT EXISTS ai_player_outlooks_cache (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  sport TEXT NOT NULL,
  league_context_hash TEXT NOT NULL,
  outlook_payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_player_outlooks_cache_ctx_key
  ON ai_player_outlooks_cache (player_id, sport, league_context_hash);
CREATE INDEX IF NOT EXISTS ai_player_outlooks_cache_expires_idx ON ai_player_outlooks_cache (expires_at);
