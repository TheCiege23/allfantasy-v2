-- Migration: 20260507190000_world_cup_live_match_fields
-- Add live-match metadata fields to world_cup_bracket_matches.
-- All columns are nullable so existing rows are unaffected.

ALTER TABLE "world_cup_bracket_matches"
  ADD COLUMN IF NOT EXISTS "elapsed_minute"      INTEGER,
  ADD COLUMN IF NOT EXISTS "injury_time"         INTEGER,
  ADD COLUMN IF NOT EXISTS "period"              TEXT,
  ADD COLUMN IF NOT EXISTS "venue_name"          TEXT,
  ADD COLUMN IF NOT EXISTS "venue_city"          TEXT,
  ADD COLUMN IF NOT EXISTS "api_status_short"    TEXT,
  ADD COLUMN IF NOT EXISTS "last_score_synced_at" TIMESTAMPTZ;
