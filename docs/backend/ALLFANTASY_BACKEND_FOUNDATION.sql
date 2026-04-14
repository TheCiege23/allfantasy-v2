-- AllFantasy Backend Foundation Schema (PostgreSQL)
-- Purpose: normalized backend-first schema covering users, leagues, settings,
-- rosters, drafts, transactions, waivers, trades, scoring, schedules, payments,
-- chat, notifications, AI, commissioner integrity, imports, analytics, and jobs.
--
-- Notes:
-- 1) Uses af_ prefix to avoid collisions with existing app tables.
-- 2) Can be split into migrations per domain.
-- 3) Designed for Postgres 14+ and Supabase compatibility.

create extension if not exists pgcrypto;

-- ==============================
-- Shared types
-- ==============================
create type af_league_status as enum ('pre_draft', 'draft_live', 'active', 'playoffs', 'completed', 'archived');
create type af_league_visibility as enum ('public', 'private', 'invite_only');
create type af_league_type as enum (
  'redraft','dynasty','keeper','best_ball','guillotine','survivor','zombie',
  'tournament','big_brother','devy','c2c','lock_in','category','points'
);
create type af_member_role as enum ('admin', 'commissioner', 'co_owner', 'member', 'viewer');
create type af_invite_status as enum ('pending', 'accepted', 'declined', 'expired', 'revoked');
create type af_transaction_type as enum (
  'add','drop','lineup_move','waiver_claim','faab_adjustment','trade','draft_pick',
  'roster_promotion','ir_move','taxi_move','devy_move','commissioner_override'
);
create type af_trade_status as enum ('proposed', 'countered', 'accepted', 'rejected', 'vetoed', 'expired', 'processed');
create type af_notification_channel as enum ('in_app', 'push', 'email', 'sms', 'webhook');
create type af_job_status as enum ('queued', 'running', 'success', 'failed', 'cancelled', 'retrying');

-- ==============================
-- Shared trigger
-- ==============================
create or replace function af_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ==============================
-- 1) Users / Auth / Profile
-- ==============================
create table if not exists af_users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  phone text unique,
  password_hash text,
  email_verified boolean not null default false,
  phone_verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists af_user_profiles (
  user_id uuid primary key references af_users(id) on delete cascade,
  username text unique,
  display_name text not null,
  avatar_url text,
  timezone text not null default 'UTC',
  preferred_language text not null default 'en',
  birthdate date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists af_user_preferences (
  user_id uuid primary key references af_users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists af_user_sport_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references af_users(id) on delete cascade,
  sport text not null,
  preference_rank int not null default 1,
  created_at timestamptz not null default now(),
  unique(user_id, sport)
);

create table if not exists af_user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references af_users(id) on delete cascade,
  plan_code text not null,
  status text not null,
  provider text not null,
  external_subscription_id text,
  started_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists af_user_notification_settings (
  user_id uuid primary key references af_users(id) on delete cascade,
  channels jsonb not null default '{"in_app":true,"push":false,"email":false,"sms":false}'::jsonb,
  quiet_hours jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists af_user_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references af_users(id) on delete cascade,
  currency text not null default 'USD',
  balance numeric(14,2) not null default 0,
  escrow_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, currency)
);

create table if not exists af_user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references af_users(id) on delete cascade,
  badge_code text not null,
  awarded_at timestamptz not null default now(),
  context jsonb not null default '{}'::jsonb
);

create table if not exists af_user_xp_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references af_users(id) on delete cascade,
  xp_delta int not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists af_user_block_list (
  user_id uuid not null references af_users(id) on delete cascade,
  blocked_user_id uuid not null references af_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_user_id)
);

-- ==============================
-- 2) Leagues / 3) Teams / 4) Membership
-- ==============================
create table if not exists af_leagues (
  id uuid primary key default gen_random_uuid(),
  sport text not null,
  league_type af_league_type not null,
  name text not null,
  description text,
  season_year int not null,
  status af_league_status not null default 'pre_draft',
  visibility af_league_visibility not null default 'private',
  source_type text not null default 'created',
  source_platform text,
  current_phase text not null default 'setup',
  is_public boolean not null default false,
  is_paid boolean not null default false,
  entry_fee numeric(14,2) not null default 0,
  currency text not null default 'USD',
  created_by uuid not null references af_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists af_league_meta (
  league_id uuid primary key references af_leagues(id) on delete cascade,
  tags text[] not null default '{}',
  external_ids jsonb not null default '{}'::jsonb,
  import_metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists af_teams (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  owner_user_id uuid references af_users(id),
  team_name text not null,
  logo_url text,
  is_archived boolean not null default false,
  current_rank int,
  wins int not null default 0,
  losses int not null default 0,
  ties int not null default 0,
  points_for numeric(14,2) not null default 0,
  points_against numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists af_team_members (
  team_id uuid not null references af_teams(id) on delete cascade,
  user_id uuid not null references af_users(id) on delete cascade,
  role af_member_role not null,
  can_edit_team boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists af_league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  user_id uuid not null references af_users(id) on delete cascade,
  team_id uuid references af_teams(id) on delete set null,
  role af_member_role not null default 'member',
  invite_status af_invite_status not null default 'accepted',
  can_edit_team boolean not null default true,
  can_edit_settings boolean not null default false,
  can_chat boolean not null default true,
  can_trade boolean not null default true,
  can_vote boolean not null default true,
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  unique(league_id, user_id)
);

create table if not exists af_membership_invites (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  invited_email text,
  invited_user_id uuid references af_users(id),
  invited_by uuid not null references af_users(id),
  role af_member_role not null default 'member',
  status af_invite_status not null default 'pending',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==============================
-- 5) Settings + versioning/audit
-- ==============================
create table if not exists af_league_settings_general (league_id uuid primary key references af_leagues(id) on delete cascade, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists af_league_settings_roster (league_id uuid primary key references af_leagues(id) on delete cascade, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists af_league_settings_scoring (league_id uuid primary key references af_leagues(id) on delete cascade, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists af_league_settings_draft (league_id uuid primary key references af_leagues(id) on delete cascade, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists af_league_settings_playoff (league_id uuid primary key references af_leagues(id) on delete cascade, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists af_league_settings_schedule (league_id uuid primary key references af_leagues(id) on delete cascade, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists af_league_settings_team (league_id uuid primary key references af_leagues(id) on delete cascade, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists af_league_settings_member (league_id uuid primary key references af_leagues(id) on delete cascade, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists af_league_settings_commissioner (league_id uuid primary key references af_leagues(id) on delete cascade, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());

create table if not exists af_settings_versions (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  domain text not null,
  version int not null,
  before_snapshot jsonb,
  after_snapshot jsonb not null,
  changed_by uuid references af_users(id),
  reason text,
  created_at timestamptz not null default now(),
  unique(league_id, domain, version)
);

create table if not exists af_settings_audit_log (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  domain text not null,
  action text not null,
  actor_user_id uuid references af_users(id),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ==============================
-- 6) Rosters / 7) Players & assets
-- ==============================
create table if not exists af_roster_templates (
  id uuid primary key default gen_random_uuid(),
  sport text not null,
  league_type af_league_type,
  name text not null,
  config jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists af_league_roster_configs (
  league_id uuid primary key references af_leagues(id) on delete cascade,
  template_id uuid references af_roster_templates(id),
  config jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists af_players (
  id uuid primary key default gen_random_uuid(),
  sport text not null,
  display_name text not null,
  position text,
  team_code text,
  status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists af_player_external_ids (
  player_id uuid not null references af_players(id) on delete cascade,
  provider text not null,
  external_id text not null,
  primary key (player_id, provider),
  unique(provider, external_id)
);

create table if not exists af_assets (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  asset_type text not null check (asset_type in ('player','pick','rights','devy_slot')),
  player_id uuid references af_players(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists af_team_rosters (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  team_id uuid not null references af_teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(league_id, team_id)
);

create table if not exists af_roster_entries (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references af_team_rosters(id) on delete cascade,
  asset_id uuid not null references af_assets(id) on delete cascade,
  section text not null default 'active',
  slot_code text,
  acquired_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(roster_id, asset_id)
);

create table if not exists af_lineup_entries (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  team_id uuid not null references af_teams(id) on delete cascade,
  week_or_period int not null,
  slot_code text not null,
  asset_id uuid not null references af_assets(id) on delete cascade,
  is_locked boolean not null default false,
  source text not null default 'manual',
  updated_by uuid references af_users(id),
  updated_at timestamptz not null default now(),
  unique(league_id, team_id, week_or_period, slot_code)
);

-- ==============================
-- 8) Draft
-- ==============================
create table if not exists af_drafts (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  draft_type text not null,
  order_type text not null,
  current_round int not null default 1,
  current_pick int not null default 1,
  timer_seconds int not null default 90,
  is_paused boolean not null default false,
  is_completed boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists af_draft_orders (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references af_drafts(id) on delete cascade,
  round int not null,
  slot int not null,
  team_id uuid not null references af_teams(id) on delete cascade,
  unique(draft_id, round, slot)
);

create table if not exists af_draft_picks (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references af_drafts(id) on delete cascade,
  round int not null,
  slot int not null,
  overall int not null,
  team_id uuid not null references af_teams(id) on delete cascade,
  asset_id uuid references af_assets(id),
  pick_metadata jsonb not null default '{}'::jsonb,
  made_at timestamptz,
  unique(draft_id, overall)
);

create table if not exists af_auction_bids (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references af_drafts(id) on delete cascade,
  team_id uuid not null references af_teams(id) on delete cascade,
  asset_id uuid references af_assets(id),
  amount numeric(14,2) not null,
  status text not null,
  created_at timestamptz not null default now()
);

-- ==============================
-- 9) Transactions / 10) Waivers / 11) Trades
-- ==============================
create table if not exists af_transactions (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  team_id uuid not null references af_teams(id) on delete cascade,
  transaction_type af_transaction_type not null,
  status text not null default 'pending',
  source text not null,
  created_by uuid references af_users(id),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists af_transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references af_transactions(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  asset_id uuid references af_assets(id),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists af_waiver_settings (
  league_id uuid primary key references af_leagues(id) on delete cascade,
  mode text not null,
  faab_enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists af_waiver_claims (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  team_id uuid not null references af_teams(id) on delete cascade,
  priority int,
  bid_amount numeric(14,2),
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists af_faab_ledger (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  team_id uuid not null references af_teams(id) on delete cascade,
  delta numeric(14,2) not null,
  reason text not null,
  related_claim_id uuid references af_waiver_claims(id),
  created_at timestamptz not null default now()
);

create table if not exists af_trades (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  proposer_team_id uuid not null references af_teams(id) on delete cascade,
  receiver_team_id uuid not null references af_teams(id) on delete cascade,
  status af_trade_status not null default 'proposed',
  review_window_ends_at timestamptz,
  proposed_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists af_trade_items (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references af_trades(id) on delete cascade,
  from_team_id uuid not null references af_teams(id) on delete cascade,
  to_team_id uuid not null references af_teams(id) on delete cascade,
  asset_id uuid references af_assets(id),
  faab_amount numeric(14,2),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists af_trade_votes (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references af_trades(id) on delete cascade,
  voter_user_id uuid not null references af_users(id) on delete cascade,
  vote text not null check (vote in ('approve','veto')),
  voted_at timestamptz not null default now(),
  unique(trade_id, voter_user_id)
);

-- ==============================
-- 12) Scoring / Matchups / Standings
-- ==============================
create table if not exists af_matchups (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  week_or_period int not null,
  home_team_id uuid not null references af_teams(id) on delete cascade,
  away_team_id uuid not null references af_teams(id) on delete cascade,
  status text not null default 'scheduled',
  home_score numeric(14,2) not null default 0,
  away_score numeric(14,2) not null default 0,
  started_at timestamptz,
  finalized_at timestamptz,
  unique(league_id, week_or_period, home_team_id, away_team_id)
);

create table if not exists af_player_fantasy_scores (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  week_or_period int not null,
  player_id uuid not null references af_players(id) on delete cascade,
  team_id uuid references af_teams(id),
  score numeric(14,2) not null,
  breakdown jsonb not null default '{}'::jsonb,
  version int not null default 1,
  computed_at timestamptz not null default now(),
  unique(league_id, week_or_period, player_id, version)
);

create table if not exists af_standings_snapshots (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  week_or_period int not null,
  standings jsonb not null,
  created_at timestamptz not null default now(),
  unique(league_id, week_or_period)
);

-- ==============================
-- 13) Schedule / playoffs
-- ==============================
create table if not exists af_schedule_templates (
  id uuid primary key default gen_random_uuid(),
  sport text not null,
  league_type af_league_type,
  name text not null,
  template jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists af_playoff_configs (
  league_id uuid primary key references af_leagues(id) on delete cascade,
  config jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists af_playoff_brackets (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  season_year int not null,
  bracket jsonb not null,
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(league_id, season_year)
);

-- ==============================
-- 14) Payments / balances / payouts
-- ==============================
create table if not exists af_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references af_users(id),
  league_id uuid references af_leagues(id),
  team_id uuid references af_teams(id),
  provider text,
  provider_event_id text,
  entry_type text not null,
  amount numeric(14,2) not null,
  currency text not null default 'USD',
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);

create table if not exists af_payout_requests (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  team_id uuid not null references af_teams(id) on delete cascade,
  requested_by uuid not null references af_users(id),
  amount numeric(14,2) not null,
  status text not null default 'pending',
  provider text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==============================
-- 15) Chat / messaging
-- ==============================
create table if not exists af_chat_rooms (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references af_leagues(id) on delete cascade,
  room_type text not null,
  name text,
  created_by uuid references af_users(id),
  created_at timestamptz not null default now()
);

create table if not exists af_chat_room_members (
  room_id uuid not null references af_chat_rooms(id) on delete cascade,
  user_id uuid not null references af_users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists af_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references af_chat_rooms(id) on delete cascade,
  sender_user_id uuid references af_users(id),
  message_type text not null default 'text',
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

-- ==============================
-- 16) Notifications / alerts
-- ==============================
create table if not exists af_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references af_users(id) on delete cascade,
  league_id uuid references af_leagues(id),
  notification_type text not null,
  title text not null,
  body text,
  severity text,
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists af_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references af_notifications(id) on delete cascade,
  channel af_notification_channel not null,
  status text not null,
  provider_message_id text,
  attempted_at timestamptz not null default now()
);

-- ==============================
-- 17) AI / Chimmy
-- ==============================
create table if not exists af_ai_tasks (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references af_leagues(id),
  user_id uuid references af_users(id),
  task_type text not null,
  status text not null default 'queued',
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists af_ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references af_ai_tasks(id) on delete set null,
  league_id uuid references af_leagues(id),
  user_id uuid references af_users(id),
  recommendation_type text not null,
  payload jsonb not null,
  confidence numeric(5,2),
  created_at timestamptz not null default now()
);

create table if not exists af_ai_memory_entries (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('session','user','league','team')),
  scope_id text not null,
  memory_key text not null,
  memory_value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(scope, scope_id, memory_key)
);

create table if not exists af_ai_provider_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references af_ai_tasks(id) on delete set null,
  provider text not null,
  model text,
  prompt_tokens int,
  completion_tokens int,
  latency_ms int,
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ==============================
-- 18) Commissioner / audit / integrity
-- ==============================
create table if not exists af_commissioner_actions (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  actor_user_id uuid not null references af_users(id),
  action_type text not null,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists af_integrity_flags (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references af_leagues(id) on delete cascade,
  team_id uuid references af_teams(id),
  flag_type text not null,
  severity text not null,
  status text not null default 'open',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==============================
-- 19) Imports / external sync
-- ==============================
create table if not exists af_import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references af_users(id),
  provider text not null,
  status af_job_status not null default 'queued',
  source_league_id text,
  target_league_id uuid references af_leagues(id),
  mapping jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists af_external_sync_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  entity_type text not null,
  entity_id text,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ==============================
-- 20) Analytics / events / jobs
-- ==============================
create table if not exists af_domain_events (
  id uuid primary key default gen_random_uuid(),
  aggregate_type text not null,
  aggregate_id text not null,
  event_type text not null,
  event_version int not null default 1,
  payload jsonb not null,
  occurred_at timestamptz not null default now(),
  published_at timestamptz,
  unique(event_type, aggregate_id, occurred_at)
);

create table if not exists af_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  queue_name text not null,
  status af_job_status not null,
  payload jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists af_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'received',
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(provider, provider_event_id)
);

-- ==============================
-- Indexes
-- ==============================
create index if not exists idx_af_leagues_sport_type on af_leagues(sport, league_type);
create index if not exists idx_af_league_members_lookup on af_league_members(league_id, user_id, role);
create index if not exists idx_af_teams_league on af_teams(league_id);
create index if not exists idx_af_messages_room_created on af_messages(room_id, created_at desc);
create index if not exists idx_af_notifications_user_created on af_notifications(user_id, created_at desc);
create index if not exists idx_af_domain_events_unpublished on af_domain_events(published_at) where published_at is null;
create index if not exists idx_af_domain_events_roster_latest on af_domain_events(aggregate_type, event_type, aggregate_id, occurred_at desc);
create index if not exists idx_af_domain_events_roster_idempotency on af_domain_events(aggregate_type, event_type, aggregate_id, (payload->>'idempotencyKey'), occurred_at desc) where aggregate_type = 'roster' and event_type = 'RosterUpdated';
create index if not exists idx_af_job_runs_queue_status on af_job_runs(queue_name, status, created_at desc);

-- ==============================
-- Updated_at triggers
-- ==============================
create trigger af_users_updated before update on af_users for each row execute function af_set_updated_at();
create trigger af_user_profiles_updated before update on af_user_profiles for each row execute function af_set_updated_at();
create trigger af_user_preferences_updated before update on af_user_preferences for each row execute function af_set_updated_at();
create trigger af_user_subscriptions_updated before update on af_user_subscriptions for each row execute function af_set_updated_at();
create trigger af_user_notification_settings_updated before update on af_user_notification_settings for each row execute function af_set_updated_at();
create trigger af_user_wallets_updated before update on af_user_wallets for each row execute function af_set_updated_at();
create trigger af_leagues_updated before update on af_leagues for each row execute function af_set_updated_at();
create trigger af_membership_invites_updated before update on af_membership_invites for each row execute function af_set_updated_at();
create trigger af_league_roster_configs_updated before update on af_league_roster_configs for each row execute function af_set_updated_at();
create trigger af_players_updated before update on af_players for each row execute function af_set_updated_at();
create trigger af_drafts_updated before update on af_drafts for each row execute function af_set_updated_at();
create trigger af_payout_requests_updated before update on af_payout_requests for each row execute function af_set_updated_at();
create trigger af_ai_tasks_updated before update on af_ai_tasks for each row execute function af_set_updated_at();
create trigger af_ai_memory_entries_updated before update on af_ai_memory_entries for each row execute function af_set_updated_at();
create trigger af_integrity_flags_updated before update on af_integrity_flags for each row execute function af_set_updated_at();
create trigger af_import_jobs_updated before update on af_import_jobs for each row execute function af_set_updated_at();