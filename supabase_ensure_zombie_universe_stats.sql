-- =============================================================================
-- supabase_ensure_zombie_universe_stats.sql
-- Extended universe stats for shared stat boards, movement history, and
-- cross-league leaderboards.
-- =============================================================================

-- Universe shared stat board (cross-league aggregated leaderboard)
CREATE TABLE IF NOT EXISTS "zombie_universe_leaderboard" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "universeId" TEXT NOT NULL,
  "season" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "displayName" TEXT,
  "avatarUrl" TEXT,
  "leagueId" TEXT NOT NULL,
  "leagueName" TEXT,
  "tierLabel" TEXT,
  "currentStatus" TEXT DEFAULT 'survivor',
  "isWhisperer" BOOLEAN DEFAULT false,

  -- Record
  "wins" INTEGER DEFAULT 0,
  "losses" INTEGER DEFAULT 0,
  "ties" INTEGER DEFAULT 0,
  "pointsFor" DOUBLE PRECISION DEFAULT 0,
  "pointsAgainst" DOUBLE PRECISION DEFAULT 0,
  "ppw" DOUBLE PRECISION DEFAULT 0,
  "winPct" DOUBLE PRECISION DEFAULT 0,

  -- Zombie-specific stats
  "infectionsInflicted" INTEGER DEFAULT 0,
  "infectionsReceived" INTEGER DEFAULT 0,
  "weekSurvived" INTEGER DEFAULT 0,
  "serumsUsed" INTEGER DEFAULT 0,
  "serumsHeld" INTEGER DEFAULT 0,
  "weaponsUsed" INTEGER DEFAULT 0,
  "weaponsHeld" INTEGER DEFAULT 0,
  "bashingsWon" INTEGER DEFAULT 0,
  "bashingsLost" INTEGER DEFAULT 0,
  "maulingsWon" INTEGER DEFAULT 0,
  "maulingsLost" INTEGER DEFAULT 0,
  "ambushesDeployed" INTEGER DEFAULT 0,
  "bombsDetonated" INTEGER DEFAULT 0,
  "revivals" INTEGER DEFAULT 0,

  -- Rank
  "universeRank" INTEGER,
  "lastUpdatedWeek" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "zombie_universe_leaderboard_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "zombie_universe_leaderboard_uid_season_key"
  ON "zombie_universe_leaderboard" ("universeId", "userId", "season");
CREATE INDEX IF NOT EXISTS "zombie_universe_leaderboard_universe_idx"
  ON "zombie_universe_leaderboard" ("universeId", "season");

-- Movement history (promotion/relegation/lateral records)
CREATE TABLE IF NOT EXISTS "zombie_universe_movement_history" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "universeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "displayName" TEXT,
  "season" INTEGER NOT NULL,
  "week" INTEGER,
  "movementType" TEXT NOT NULL, -- 'promoted', 'relegated', 'lateral', 'joined', 'left'
  "fromTierLabel" TEXT,
  "toTierLabel" TEXT,
  "fromLeagueId" TEXT,
  "toLeagueId" TEXT,
  "reason" TEXT,
  "metadata" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "zombie_universe_movement_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "zombie_universe_movement_history_uid_idx"
  ON "zombie_universe_movement_history" ("universeId", "season");

-- Weekly universe digest (auto-posted cross-league summary per week)
CREATE TABLE IF NOT EXISTS "zombie_universe_digests" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "universeId" TEXT NOT NULL,
  "week" INTEGER NOT NULL,
  "season" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "title" TEXT,
  "stats" JSONB DEFAULT '{}',
  "isPosted" BOOLEAN DEFAULT false,
  "postedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "zombie_universe_digests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "zombie_universe_digests_week_key"
  ON "zombie_universe_digests" ("universeId", "week", "season");

-- Sport-specific rules templates (one per sport)
CREATE TABLE IF NOT EXISTS "zombie_rules_templates" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "sport" TEXT NOT NULL,
  "positionList" TEXT[] DEFAULT '{}',
  "rosterSize" INTEGER DEFAULT 15,
  "starterCount" INTEGER DEFAULT 9,
  "benchCount" INTEGER DEFAULT 6,
  "irSlotsDefault" INTEGER DEFAULT 2,
  "lineupFrequency" TEXT DEFAULT 'weekly',
  "scoringWindowDesc" TEXT,
  "lineupLockDesc" TEXT,
  "bashingThreshold" DOUBLE PRECISION DEFAULT 30,
  "maulingThreshold" DOUBLE PRECISION DEFAULT 50,
  "serumAwardDesc" TEXT,
  "edgeCaseNotes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "zombie_rules_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "zombie_rules_templates_sport_key"
  ON "zombie_rules_templates" ("sport");

-- Seed sport-specific templates for all 7 sports
INSERT INTO "zombie_rules_templates" ("id", "sport", "positionList", "rosterSize", "starterCount", "benchCount", "irSlotsDefault", "lineupFrequency", "scoringWindowDesc", "lineupLockDesc", "bashingThreshold", "maulingThreshold", "serumAwardDesc", "edgeCaseNotes")
VALUES
  (gen_random_uuid()::text, 'nfl',
   ARRAY['QB','RB','RB','WR','WR','TE','FLEX','K','DEF'],
   15, 9, 6, 2, 'weekly',
   'Weekly: Thursday through Monday (NFL schedule).',
   'Individual game kickoff locks each player.',
   30.0, 50.0,
   'Awarded for season-high score or surviving a bashing.',
   'Monday Night Football finishes: stat corrections may reverse infections within 48h window.'),

  (gen_random_uuid()::text, 'nba',
   ARRAY['PG','SG','SF','PF','C','UTIL','UTIL','UTIL'],
   13, 8, 5, 2, 'daily',
   'Daily: Each day''s slate of games scores independently.',
   'Tip-off locks per player per day.',
   45.0, 70.0,
   'Awarded weekly for top scorer among survivors.',
   'Back-to-backs and rest days affect availability. Use bench strategically.'),

  (gen_random_uuid()::text, 'mlb',
   ARRAY['C','1B','2B','3B','SS','OF','OF','OF','UTIL','SP','SP','RP','RP'],
   20, 13, 7, 3, 'daily',
   'Daily: Each day''s games score. Weekly aggregate determines matchup winner.',
   'First pitch locks per player per day.',
   40.0, 65.0,
   'Awarded weekly for highest aggregate weekly score.',
   'Doubleheaders count both games. Rainouts reschedule; PPD players unlock.'),

  (gen_random_uuid()::text, 'nhl',
   ARRAY['C','C','LW','RW','D','D','UTIL','G','G'],
   14, 9, 5, 2, 'daily',
   'Daily: Each day''s games score. Weekly aggregate determines matchup winner.',
   'Puck drop locks per player per day.',
   8.0, 14.0,
   'Awarded weekly for top-scoring survivor in the league.',
   'Goalie starts are critical. Overtime and shootout goals count.'),

  (gen_random_uuid()::text, 'ncaaf',
   ARRAY['QB','RB','RB','WR','WR','TE','FLEX','K','DEF'],
   15, 9, 6, 2, 'weekly',
   'Weekly: Saturday games (plus occasional weeknight games).',
   'Individual game kickoff locks each player.',
   35.0, 55.0,
   'Awarded for season-high score or surviving a bashing.',
   'Bye weeks are less uniform than NFL. Conference championship and bowl games may extend season.'),

  (gen_random_uuid()::text, 'ncaab',
   ARRAY['PG','SG','SF','PF','C','UTIL','UTIL'],
   12, 7, 5, 2, 'daily',
   'Daily: Each day''s games score. Weekly aggregate determines matchup winner.',
   'Tip-off locks per player per day.',
   40.0, 65.0,
   'Awarded weekly for top scorer among survivors.',
   'March Madness disrupts schedules. Conference tournaments may create scoring spikes.'),

  (gen_random_uuid()::text, 'soccer',
   ARRAY['GK','DEF','DEF','DEF','DEF','MID','MID','MID','FWD','FWD','FWD'],
   18, 11, 7, 2, 'weekly',
   'Weekly: Matchweek games (Sat-Mon for most leagues).',
   'Match kickoff locks per player.',
   25.0, 40.0,
   'Awarded for clean sheet performance or highest weekly score.',
   'Midweek cup fixtures may or may not count depending on commissioner settings. International breaks create gaps.')
ON CONFLICT DO NOTHING;
