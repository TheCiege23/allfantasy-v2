-- World Cup bracket entries (Neon uses snake_case columns for existing WC tables).

ALTER TABLE world_cup_bracket_participants ADD COLUMN IF NOT EXISTS champion_pick_name TEXT;
ALTER TABLE world_cup_bracket_participants ADD COLUMN IF NOT EXISTS correct_picks INTEGER NOT NULL DEFAULT 0;
ALTER TABLE world_cup_bracket_participants ADD COLUMN IF NOT EXISTS round_breakdown JSONB;

ALTER TABLE world_cup_bracket_challenges ADD COLUMN IF NOT EXISTS invite_url TEXT;
ALTER TABLE world_cup_bracket_challenges ADD COLUMN IF NOT EXISTS source_payload JSONB;

ALTER TABLE world_cup_bracket_matches ADD COLUMN IF NOT EXISTS home_penalty_score INTEGER;
ALTER TABLE world_cup_bracket_matches ADD COLUMN IF NOT EXISTS away_penalty_score INTEGER;

CREATE TABLE world_cup_bracket_entries (
    id TEXT NOT NULL,
    challenge_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    champion_team_id TEXT,
    champion_team_name TEXT,
    total_score INTEGER NOT NULL DEFAULT 0,
    max_possible_score INTEGER NOT NULL DEFAULT 0,
    correct_picks INTEGER NOT NULL DEFAULT 0,
    incorrect_picks INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    round_breakdown JSONB NOT NULL DEFAULT '{}',
    is_complete BOOLEAN NOT NULL DEFAULT false,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    submitted_at TIMESTAMP(3),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT world_cup_bracket_entries_pkey PRIMARY KEY (id)
);

CREATE INDEX world_cup_bracket_entries_challenge_id_idx ON world_cup_bracket_entries(challenge_id);
CREATE INDEX world_cup_bracket_entries_participant_id_idx ON world_cup_bracket_entries(participant_id);
CREATE INDEX world_cup_bracket_entries_user_id_idx ON world_cup_bracket_entries(user_id);
CREATE INDEX world_cup_bracket_entries_challenge_id_rank_idx ON world_cup_bracket_entries(challenge_id, rank);

ALTER TABLE world_cup_bracket_entries ADD CONSTRAINT world_cup_bracket_entries_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES world_cup_bracket_challenges(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE world_cup_bracket_entries ADD CONSTRAINT world_cup_bracket_entries_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES world_cup_bracket_participants(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE world_cup_bracket_entries ADD CONSTRAINT world_cup_bracket_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE world_cup_bracket_entries ADD CONSTRAINT world_cup_bracket_entries_champion_team_id_fkey FOREIGN KEY (champion_team_id) REFERENCES world_cup_teams(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE world_cup_bracket_picks ADD COLUMN IF NOT EXISTS entry_id TEXT;

INSERT INTO world_cup_bracket_entries (
    id,
    challenge_id,
    participant_id,
    user_id,
    name,
    total_score,
    max_possible_score,
    correct_picks,
    incorrect_picks,
    rank,
    round_breakdown,
    champion_team_id,
    champion_team_name,
    is_complete,
    is_locked,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid()::text,
    p.challenge_id,
    p.id,
    p.user_id,
    'Bracket 1',
    p.total_score,
    p.max_possible_score,
    p.correct_picks,
    0,
    p.rank,
    COALESCE(p.round_breakdown, '{}'::jsonb),
    p.champion_pick_team_id,
    p.champion_pick_name,
    false,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM world_cup_bracket_participants p;

UPDATE world_cup_bracket_picks AS pick
SET entry_id = e.id
FROM world_cup_bracket_entries AS e
WHERE e.participant_id = pick.participant_id;

DROP INDEX IF EXISTS world_cup_bracket_picks_participant_id_match_id_key;

ALTER TABLE world_cup_bracket_picks ALTER COLUMN entry_id SET NOT NULL;

CREATE UNIQUE INDEX world_cup_bracket_picks_entry_id_match_id_key ON world_cup_bracket_picks(entry_id, match_id);

ALTER TABLE world_cup_bracket_picks ADD CONSTRAINT world_cup_bracket_picks_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES world_cup_bracket_entries(id) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS world_cup_bracket_picks_entry_id_idx ON world_cup_bracket_picks(entry_id);

ALTER TABLE world_cup_bracket_challenges ADD COLUMN IF NOT EXISTS max_participants INTEGER NOT NULL DEFAULT 100;
ALTER TABLE world_cup_bracket_challenges ADD COLUMN IF NOT EXISTS max_entries_per_participant INTEGER NOT NULL DEFAULT 5;

ALTER TABLE world_cup_bracket_challenges ALTER COLUMN pick_lock_strategy SET DEFAULT 'tournament_start';

ALTER TABLE world_cup_bracket_scoring_profiles ALTER COLUMN round_of_32_points SET DEFAULT 10;
ALTER TABLE world_cup_bracket_scoring_profiles ALTER COLUMN round_of_16_points SET DEFAULT 20;
ALTER TABLE world_cup_bracket_scoring_profiles ALTER COLUMN quarter_final_points SET DEFAULT 40;
ALTER TABLE world_cup_bracket_scoring_profiles ALTER COLUMN semi_final_points SET DEFAULT 80;
ALTER TABLE world_cup_bracket_scoring_profiles ALTER COLUMN final_points SET DEFAULT 160;
ALTER TABLE world_cup_bracket_scoring_profiles ALTER COLUMN champion_bonus_points SET DEFAULT 320;
