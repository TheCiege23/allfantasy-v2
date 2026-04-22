-- AllFantasy AI Opponents — persistence for bot profiles, team assignments, memory, audit, trade cooldowns
-- Aligns with Prisma models in prisma/schema.prisma (AiOpponentProfile, …).
-- Apply after backups. Idempotent: IF NOT EXISTS. Prefer `npx prisma migrate` for app deploys.

-- Catalog of reusable bot profiles (seeded from lib/ai/opponents/botProfiles.ts via ensureBotProfilesSeeded)
CREATE TABLE IF NOT EXISTS ai_opponent_profiles (
  id TEXT PRIMARY KEY,
  bot_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  archetype_id TEXT NOT NULL,
  tendencies JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_opponent_profiles_archetype_id_idx ON ai_opponent_profiles (archetype_id);

-- One AI manager per league team slot
CREATE TABLE IF NOT EXISTS ai_opponent_team_assignments (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL,
  league_team_id TEXT NOT NULL UNIQUE,
  bot_profile_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'active',
  think_speed TEXT NOT NULL DEFAULT 'normal',
  trade_aggression TEXT NOT NULL DEFAULT 'medium',
  waiver_aggression TEXT NOT NULL DEFAULT 'medium',
  personality_mode TEXT NOT NULL DEFAULT 'from_profile',
  is_takeover BOOLEAN NOT NULL DEFAULT FALSE,
  takeover_until TIMESTAMPTZ,
  replaced_by_user_id TEXT,
  paused BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_opponent_team_assignments_league_id_idx ON ai_opponent_team_assignments (league_id);
CREATE INDEX IF NOT EXISTS ai_opponent_team_assignments_bot_profile_id_idx ON ai_opponent_team_assignments (bot_profile_id);

-- Optional FKs — enable when leagues / teams tables use TEXT ids compatible with Prisma
-- ALTER TABLE ai_opponent_team_assignments ADD CONSTRAINT ai_opp_team_assign_league_fk FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE;
-- ALTER TABLE ai_opponent_team_assignments ADD CONSTRAINT ai_opp_team_assign_team_fk FOREIGN KEY (league_team_id) REFERENCES league_teams(id) ON DELETE CASCADE;
-- ALTER TABLE ai_opponent_team_assignments ADD CONSTRAINT ai_opp_team_assign_profile_fk FOREIGN KEY (bot_profile_id) REFERENCES ai_opponent_profiles(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS ai_opponent_league_memory (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL UNIQUE,
  state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_opponent_league_memory_updated_at_idx ON ai_opponent_league_memory (updated_at);

CREATE TABLE IF NOT EXISTS ai_opponent_action_logs (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL,
  league_team_id TEXT,
  bot_profile_id TEXT,
  action_type TEXT NOT NULL,
  payload JSONB,
  result JSONB,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_opponent_action_logs_league_created_idx ON ai_opponent_action_logs (league_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_opponent_action_logs_action_type_idx ON ai_opponent_action_logs (action_type);

CREATE TABLE IF NOT EXISTS ai_opponent_trade_cooldowns (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL,
  league_team_id TEXT NOT NULL,
  last_proposal_at TIMESTAMPTZ,
  proposal_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (league_id, league_team_id)
);

CREATE INDEX IF NOT EXISTS ai_opponent_trade_cooldowns_league_id_idx ON ai_opponent_trade_cooldowns (league_id);
