-- World Cup group stage tables, commissioner settings, chat events, and event state.
-- These tables are new (never existed in camelCase form) so snake_case columns are used
-- directly — no rename DO-blocks needed.
--
-- Tables created:
--   world_cup_groups
--   world_cup_group_teams
--   world_cup_group_ranking_picks
--   world_cup_third_place_advancer_picks
--   world_cup_bracket_commissioner_settings
--   world_cup_bracket_chat_events
--   world_cup_bracket_event_state
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- world_cup_groups
-- ---------------------------------------------------------------------------
CREATE TABLE world_cup_groups (
    id TEXT NOT NULL,
    challenge_id TEXT NOT NULL,
    group_key TEXT NOT NULL,
    display_name TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT world_cup_groups_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX world_cup_groups_challenge_id_group_key_key
    ON world_cup_groups(challenge_id, group_key);
CREATE INDEX world_cup_groups_challenge_id_idx
    ON world_cup_groups(challenge_id);
CREATE INDEX world_cup_groups_group_key_idx
    ON world_cup_groups(group_key);

ALTER TABLE world_cup_groups
    ADD CONSTRAINT world_cup_groups_challenge_id_fkey
    FOREIGN KEY (challenge_id) REFERENCES world_cup_bracket_challenges(id)
    ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- world_cup_group_teams
-- ---------------------------------------------------------------------------
CREATE TABLE world_cup_group_teams (
    id TEXT NOT NULL,
    challenge_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    seed_order INTEGER NOT NULL,
    actual_rank INTEGER,
    points INTEGER,
    goal_difference INTEGER,
    goals_for INTEGER,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT world_cup_group_teams_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX world_cup_group_teams_challenge_id_group_id_team_id_key
    ON world_cup_group_teams(challenge_id, group_id, team_id);
CREATE INDEX world_cup_group_teams_challenge_id_idx
    ON world_cup_group_teams(challenge_id);
CREATE INDEX world_cup_group_teams_group_id_idx
    ON world_cup_group_teams(group_id);
CREATE INDEX world_cup_group_teams_team_id_idx
    ON world_cup_group_teams(team_id);

ALTER TABLE world_cup_group_teams
    ADD CONSTRAINT world_cup_group_teams_challenge_id_fkey
    FOREIGN KEY (challenge_id) REFERENCES world_cup_bracket_challenges(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE world_cup_group_teams
    ADD CONSTRAINT world_cup_group_teams_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES world_cup_groups(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE world_cup_group_teams
    ADD CONSTRAINT world_cup_group_teams_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES world_cup_teams(id)
    ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- world_cup_group_ranking_picks
-- ---------------------------------------------------------------------------
CREATE TABLE world_cup_group_ranking_picks (
    id TEXT NOT NULL,
    challenge_id TEXT NOT NULL,
    entry_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    predicted_rank INTEGER NOT NULL,
    actual_rank INTEGER,
    is_correct BOOLEAN,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT world_cup_group_ranking_picks_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX world_cup_group_ranking_picks_entry_id_group_id_predicted_rank_key
    ON world_cup_group_ranking_picks(entry_id, group_id, predicted_rank);
CREATE UNIQUE INDEX world_cup_group_ranking_picks_entry_id_group_id_team_id_key
    ON world_cup_group_ranking_picks(entry_id, group_id, team_id);
CREATE INDEX world_cup_group_ranking_picks_challenge_id_idx
    ON world_cup_group_ranking_picks(challenge_id);
CREATE INDEX world_cup_group_ranking_picks_entry_id_idx
    ON world_cup_group_ranking_picks(entry_id);
CREATE INDEX world_cup_group_ranking_picks_group_id_idx
    ON world_cup_group_ranking_picks(group_id);
CREATE INDEX world_cup_group_ranking_picks_team_id_idx
    ON world_cup_group_ranking_picks(team_id);

ALTER TABLE world_cup_group_ranking_picks
    ADD CONSTRAINT world_cup_group_ranking_picks_challenge_id_fkey
    FOREIGN KEY (challenge_id) REFERENCES world_cup_bracket_challenges(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE world_cup_group_ranking_picks
    ADD CONSTRAINT world_cup_group_ranking_picks_entry_id_fkey
    FOREIGN KEY (entry_id) REFERENCES world_cup_bracket_entries(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE world_cup_group_ranking_picks
    ADD CONSTRAINT world_cup_group_ranking_picks_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES world_cup_groups(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE world_cup_group_ranking_picks
    ADD CONSTRAINT world_cup_group_ranking_picks_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES world_cup_teams(id)
    ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- world_cup_third_place_advancer_picks
-- ---------------------------------------------------------------------------
CREATE TABLE world_cup_third_place_advancer_picks (
    id TEXT NOT NULL,
    challenge_id TEXT NOT NULL,
    entry_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    is_selected BOOLEAN NOT NULL DEFAULT true,
    actual_advanced BOOLEAN,
    is_correct BOOLEAN,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT world_cup_third_place_advancer_picks_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX world_cup_third_place_advancer_picks_entry_id_group_id_key
    ON world_cup_third_place_advancer_picks(entry_id, group_id);
CREATE INDEX world_cup_third_place_advancer_picks_challenge_id_idx
    ON world_cup_third_place_advancer_picks(challenge_id);
CREATE INDEX world_cup_third_place_advancer_picks_entry_id_idx
    ON world_cup_third_place_advancer_picks(entry_id);
CREATE INDEX world_cup_third_place_advancer_picks_group_id_idx
    ON world_cup_third_place_advancer_picks(group_id);
CREATE INDEX world_cup_third_place_advancer_picks_team_id_idx
    ON world_cup_third_place_advancer_picks(team_id);

ALTER TABLE world_cup_third_place_advancer_picks
    ADD CONSTRAINT world_cup_third_place_advancer_picks_challenge_id_fkey
    FOREIGN KEY (challenge_id) REFERENCES world_cup_bracket_challenges(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE world_cup_third_place_advancer_picks
    ADD CONSTRAINT world_cup_third_place_advancer_picks_entry_id_fkey
    FOREIGN KEY (entry_id) REFERENCES world_cup_bracket_entries(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE world_cup_third_place_advancer_picks
    ADD CONSTRAINT world_cup_third_place_advancer_picks_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES world_cup_groups(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE world_cup_third_place_advancer_picks
    ADD CONSTRAINT world_cup_third_place_advancer_picks_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES world_cup_teams(id)
    ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- world_cup_bracket_commissioner_settings
-- ---------------------------------------------------------------------------
CREATE TABLE world_cup_bracket_commissioner_settings (
    challenge_id TEXT NOT NULL,
    enable_system_events BOOLEAN NOT NULL DEFAULT true,
    enable_ai_summaries BOOLEAN NOT NULL DEFAULT false,
    enable_upset_alerts BOOLEAN NOT NULL DEFAULT true,
    enable_leaderboard_alerts BOOLEAN NOT NULL DEFAULT true,
    enable_champion_bust_alerts BOOLEAN NOT NULL DEFAULT true,
    enable_lock_reminders BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT world_cup_bracket_commissioner_settings_pkey PRIMARY KEY (challenge_id)
);

ALTER TABLE world_cup_bracket_commissioner_settings
    ADD CONSTRAINT world_cup_bracket_commissioner_settings_challenge_id_fkey
    FOREIGN KEY (challenge_id) REFERENCES world_cup_bracket_challenges(id)
    ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- world_cup_bracket_chat_events
-- ---------------------------------------------------------------------------
CREATE TABLE world_cup_bracket_chat_events (
    id TEXT NOT NULL,
    challenge_id TEXT NOT NULL,
    bracket_entry_id TEXT,
    user_id TEXT,
    event_type TEXT NOT NULL,
    event_title TEXT NOT NULL,
    event_body TEXT NOT NULL,
    metadata JSONB,
    idempotency_key TEXT NOT NULL,
    is_ai_generated BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT world_cup_bracket_chat_events_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX world_cup_bracket_chat_events_challenge_id_idempotency_key_key
    ON world_cup_bracket_chat_events(challenge_id, idempotency_key);
CREATE INDEX world_cup_bracket_chat_events_challenge_id_created_at_idx
    ON world_cup_bracket_chat_events(challenge_id, created_at DESC);

ALTER TABLE world_cup_bracket_chat_events
    ADD CONSTRAINT world_cup_bracket_chat_events_challenge_id_fkey
    FOREIGN KEY (challenge_id) REFERENCES world_cup_bracket_challenges(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE world_cup_bracket_chat_events
    ADD CONSTRAINT world_cup_bracket_chat_events_bracket_entry_id_fkey
    FOREIGN KEY (bracket_entry_id) REFERENCES world_cup_bracket_entries(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE world_cup_bracket_chat_events
    ADD CONSTRAINT world_cup_bracket_chat_events_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES app_users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- world_cup_bracket_event_state
-- ---------------------------------------------------------------------------
CREATE TABLE world_cup_bracket_event_state (
    challenge_id TEXT NOT NULL,
    last_leader_entry_id TEXT,
    last_emitted_lock_closed BOOLEAN NOT NULL DEFAULT false,
    last_perfect_bracket_count INTEGER,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT world_cup_bracket_event_state_pkey PRIMARY KEY (challenge_id)
);

ALTER TABLE world_cup_bracket_event_state
    ADD CONSTRAINT world_cup_bracket_event_state_challenge_id_fkey
    FOREIGN KEY (challenge_id) REFERENCES world_cup_bracket_challenges(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
