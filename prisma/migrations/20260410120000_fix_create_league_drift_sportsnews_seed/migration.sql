-- Fix Prisma vs Postgres drift blocking /create-league (user_profiles, leagues, SportsNews, platform_config, sport_configs).
-- Safe to re-run: IF NOT EXISTS / ON CONFLICT.

-- ─── SportsNews: drop invalid unique on sourceId (multiple rows share e.g. "espn") ───
ALTER TABLE "SportsNews" DROP CONSTRAINT IF EXISTS "SportsNews_sourceId_key";
DROP INDEX IF EXISTS "SportsNews_sourceId_key";
CREATE INDEX IF NOT EXISTS "SportsNews_sourceId_idx" ON "SportsNews" ("sourceId");

-- ─── user_profiles: rank, Discord, subs, prefs (snake_case where @map in schema) ───
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "legacy_career_tier" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "legacy_career_tier_name" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "legacy_career_level" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "legacy_career_xp" BIGINT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "legacy_rank_updated_at" TIMESTAMP(3);
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "rank_tier" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "xp_total" BIGINT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "xp_level" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "career_wins" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "career_losses" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "career_championships" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "career_playoff_appearances" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "career_seasons_played" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "career_leagues_played" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "rank_calculated_at" TIMESTAMP(3);
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "league_import_detail_pending" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "discordUserId" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "discordUsername" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "discordEmail" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "discordAvatar" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "discordAccessToken" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "discordRefreshToken" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "discordConnectedAt" TIMESTAMP(3);
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "discordGuildId" TEXT;

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "afCommissionerSub" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "afProSub" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "afWarRoomSub" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "autoCoachGlobalEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "sessionIdleTimeoutMinutes" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "avatarPreset" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "preferredSports" JSONB;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "notificationPreferences" JSONB;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "rankingsContext" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_discordUserId_key" ON "user_profiles"("discordUserId");

-- ─── leagues: Sleeper import + commissioner fields ───
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "import_wins" INTEGER;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "import_losses" INTEGER;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "import_ties" INTEGER;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "import_points_for" DOUBLE PRECISION;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "import_points_against" DOUBLE PRECISION;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "import_made_playoffs" BOOLEAN;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "import_won_championship" BOOLEAN;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "import_final_standing" INTEGER;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "importBatchId" VARCHAR(64);
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "importedAt" TIMESTAMP(3);
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "isCommissioner" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'America/New_York';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "leagueVariant" VARCHAR(32);
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "autoCoachEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "overrideInviteCapacity" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "disableInviteLinks" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "leagues_importBatchId_idx" ON "leagues" ("importBatchId");

-- ─── platform_config: enabled sports (matches FEATURE_KEYS.SPORTS_AVAILABILITY) ───
INSERT INTO "platform_config" ("id", "key", "value", "updatedAt")
VALUES (
  gen_random_uuid()::TEXT,
  'sports_availability',
  '["NFL","NBA","NHL","MLB","NCAAF","NCAAB","SOCCER"]',
  NOW()
)
ON CONFLICT ("key") DO UPDATE SET
  "value" = EXCLUDED."value",
  "updatedAt" = NOW();

-- ─── sport_configs: table + 7 LeagueSport rows for /api/sport-defaults ───
CREATE TABLE IF NOT EXISTS "sport_configs" (
    "id"                       TEXT NOT NULL,
    "sport"                    TEXT NOT NULL,
    "displayName"              TEXT NOT NULL DEFAULT '',
    "slug"                     TEXT,
    "lineupFrequency"          TEXT NOT NULL DEFAULT 'weekly',
    "scoringType"              TEXT NOT NULL DEFAULT 'points',
    "defaultScoringSystem"     TEXT NOT NULL DEFAULT 'points',
    "scoringCategories"        JSONB,
    "scoringPresets"           JSONB,
    "defaultRosterSlots"       JSONB,
    "defaultBenchSlots"        INTEGER NOT NULL DEFAULT 6,
    "defaultIRSlots"           INTEGER NOT NULL DEFAULT 0,
    "defaultTaxiSlots"         INTEGER NOT NULL DEFAULT 0,
    "defaultDevySlots"         INTEGER NOT NULL DEFAULT 0,
    "positionEligibility"      JSONB,
    "defaultSeasonWeeks"       INTEGER NOT NULL DEFAULT 17,
    "defaultPlayoffStartWeek"  INTEGER NOT NULL DEFAULT 15,
    "defaultPlayoffTeams"      INTEGER NOT NULL DEFAULT 4,
    "defaultMatchupPeriodDays" INTEGER NOT NULL DEFAULT 7,
    "lineupLockType"           TEXT NOT NULL DEFAULT 'per_player_kickoff',
    "supportsRedraft"          BOOLEAN NOT NULL DEFAULT true,
    "supportsDynasty"          BOOLEAN NOT NULL DEFAULT false,
    "supportsKeeper"           BOOLEAN NOT NULL DEFAULT false,
    "supportsDevy"             BOOLEAN NOT NULL DEFAULT false,
    "supportsC2C"              BOOLEAN NOT NULL DEFAULT false,
    "supportsIDP"              BOOLEAN NOT NULL DEFAULT false,
    "supportsSuperflex"        BOOLEAN NOT NULL DEFAULT false,
    "supportsTEPremium"        BOOLEAN NOT NULL DEFAULT false,
    "supportsPPR"              BOOLEAN NOT NULL DEFAULT false,
    "supportsCategories"       BOOLEAN NOT NULL DEFAULT false,
    "supportsDailyLineups"     BOOLEAN NOT NULL DEFAULT false,
    "commissionerSettings"     JSONB,
    "aiMetadata"               JSONB,
    "hasIR"                    BOOLEAN NOT NULL DEFAULT true,
    "hasTaxi"                  BOOLEAN NOT NULL DEFAULT false,
    "hasBye"                   BOOLEAN NOT NULL DEFAULT false,
    "maxRosterSize"            INTEGER NOT NULL DEFAULT 15,
    "defaultPositions"         JSONB NOT NULL DEFAULT '{}',
    "statCategories"           JSONB NOT NULL DEFAULT '[]',
    "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sport_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "sport_configs_sport_key" ON "sport_configs" ("sport");
CREATE UNIQUE INDEX IF NOT EXISTS "sport_configs_slug_key" ON "sport_configs" ("slug");

INSERT INTO "sport_configs" ("id","sport","displayName","slug","lineupFrequency","scoringType","defaultScoringSystem","defaultSeasonWeeks","defaultPlayoffStartWeek","defaultPlayoffTeams","defaultMatchupPeriodDays","lineupLockType","supportsRedraft","supportsDynasty","supportsKeeper","supportsDevy","supportsC2C","supportsIDP","supportsSuperflex","supportsTEPremium","supportsPPR","hasBye","maxRosterSize","defaultPositions","statCategories","defaultBenchSlots","defaultRosterSlots")
VALUES (gen_random_uuid()::TEXT,'NFL','NFL Football','nfl','weekly','points','points',18,15,4,7,'per_player_kickoff',true,true,true,true,true,true,true,true,true,true,16,'{"QB":1,"RB":2,"WR":2,"TE":1,"FLEX":1,"K":1,"DEF":1}'::jsonb,'["passing","rushing","receiving","kicking","defense"]'::jsonb,6,'{"QB":1,"RB":2,"WR":2,"TE":1,"FLEX":1,"K":1,"DEF":1,"BN":6}'::jsonb)
ON CONFLICT ("sport") DO UPDATE SET
  "displayName"='NFL Football', "slug"='nfl', "supportsRedraft"=true, "supportsDynasty"=true,
  "supportsKeeper"=true, "supportsDevy"=true, "supportsC2C"=true, "supportsIDP"=true,
  "supportsSuperflex"=true, "supportsTEPremium"=true, "supportsPPR"=true, "updatedAt"=NOW();

INSERT INTO "sport_configs" ("id","sport","displayName","slug","lineupFrequency","scoringType","defaultScoringSystem","defaultSeasonWeeks","defaultPlayoffStartWeek","defaultPlayoffTeams","defaultMatchupPeriodDays","lineupLockType","supportsRedraft","supportsDynasty","supportsKeeper","supportsDailyLineups","supportsCategories","maxRosterSize","defaultPositions","statCategories","defaultBenchSlots","defaultRosterSlots")
VALUES (gen_random_uuid()::TEXT,'NBA','NBA Basketball','nba','daily','categories','categories',22,20,4,7,'per_player_tipoff',true,true,true,true,true,true,13,'{"PG":1,"SG":1,"SF":1,"PF":1,"C":1,"G":1,"F":1,"UTIL":2}'::jsonb,'["points","rebounds","assists","steals","blocks","turnovers","fg_pct","ft_pct","three_pm"]'::jsonb,3,NULL)
ON CONFLICT ("sport") DO UPDATE SET
  "displayName"='NBA Basketball', "slug"='nba', "supportsDailyLineups"=true,
  "supportsCategories"=true, "supportsRedraft"=true, "supportsDynasty"=true,
  "supportsKeeper"=true, "updatedAt"=NOW();

INSERT INTO "sport_configs" ("id","sport","displayName","slug","lineupFrequency","scoringType","defaultScoringSystem","defaultSeasonWeeks","defaultPlayoffStartWeek","defaultPlayoffTeams","defaultMatchupPeriodDays","lineupLockType","supportsRedraft","supportsKeeper","supportsCategories","supportsDailyLineups","maxRosterSize","defaultPositions","statCategories","defaultBenchSlots","defaultRosterSlots")
VALUES (gen_random_uuid()::TEXT,'NHL','NHL Hockey','nhl','daily','categories','categories',24,22,4,7,'per_player_faceoff',true,true,true,true,14,'{"C":2,"LW":2,"RW":2,"D":4,"G":2}'::jsonb,'["goals","assists","plus_minus","pim","sog","hits","blocks","wins","gaa","sv_pct"]'::jsonb,2,NULL)
ON CONFLICT ("sport") DO UPDATE SET
  "displayName"='NHL Hockey', "slug"='nhl', "supportsDailyLineups"=true,
  "supportsCategories"=true, "supportsRedraft"=true, "supportsKeeper"=true, "updatedAt"=NOW();

INSERT INTO "sport_configs" ("id","sport","displayName","slug","lineupFrequency","scoringType","defaultScoringSystem","defaultSeasonWeeks","defaultPlayoffStartWeek","defaultPlayoffTeams","defaultMatchupPeriodDays","lineupLockType","supportsRedraft","supportsKeeper","supportsCategories","supportsDailyLineups","maxRosterSize","defaultPositions","statCategories","defaultBenchSlots","defaultRosterSlots")
VALUES (gen_random_uuid()::TEXT,'MLB','MLB Baseball','mlb','daily','categories','categories',23,21,4,7,'per_player_first_pitch',true,true,true,true,16,'{"C":1,"1B":1,"2B":1,"3B":1,"SS":1,"OF":3,"UTIL":1,"SP":2,"RP":2}'::jsonb,'["r","hr","rbi","sb","avg","obp","w","sv","era","whip","k"]'::jsonb,3,NULL)
ON CONFLICT ("sport") DO UPDATE SET
  "displayName"='MLB Baseball', "slug"='mlb', "supportsDailyLineups"=true,
  "supportsCategories"=true, "supportsRedraft"=true, "supportsKeeper"=true, "updatedAt"=NOW();

INSERT INTO "sport_configs" ("id","sport","displayName","slug","lineupFrequency","scoringType","defaultScoringSystem","defaultSeasonWeeks","defaultPlayoffStartWeek","defaultPlayoffTeams","defaultMatchupPeriodDays","lineupLockType","supportsRedraft","maxRosterSize","defaultPositions","statCategories","defaultBenchSlots","defaultRosterSlots")
VALUES (gen_random_uuid()::TEXT,'NCAAF','NCAA Football','ncaaf','weekly','points','points',14,12,4,7,'per_player_kickoff',true,14,'{"QB":1,"RB":2,"WR":2,"TE":1,"FLEX":1,"K":1,"DEF":1}'::jsonb,'["passing","rushing","receiving","kicking","defense"]'::jsonb,5,NULL)
ON CONFLICT ("sport") DO UPDATE SET
  "displayName"='NCAA Football', "slug"='ncaaf', "supportsRedraft"=true, "updatedAt"=NOW();

INSERT INTO "sport_configs" ("id","sport","displayName","slug","lineupFrequency","scoringType","defaultScoringSystem","defaultSeasonWeeks","defaultPlayoffStartWeek","defaultPlayoffTeams","defaultMatchupPeriodDays","lineupLockType","supportsRedraft","supportsCategories","supportsDailyLineups","maxRosterSize","defaultPositions","statCategories","defaultBenchSlots","defaultRosterSlots")
VALUES (gen_random_uuid()::TEXT,'NCAAB','NCAA Basketball','ncaab','daily','categories','categories',18,16,4,7,'per_player_tipoff',true,true,true,10,'{"G":2,"F":2,"C":1,"UTIL":2}'::jsonb,'["points","rebounds","assists","steals","blocks","turnovers","fg_pct","ft_pct","three_pm"]'::jsonb,3,NULL)
ON CONFLICT ("sport") DO UPDATE SET
  "displayName"='NCAA Basketball', "slug"='ncaab', "supportsCategories"=true,
  "supportsDailyLineups"=true, "supportsRedraft"=true, "updatedAt"=NOW();

INSERT INTO "sport_configs" ("id","sport","displayName","slug","lineupFrequency","scoringType","defaultScoringSystem","defaultSeasonWeeks","defaultPlayoffStartWeek","defaultPlayoffTeams","defaultMatchupPeriodDays","lineupLockType","supportsRedraft","supportsKeeper","maxRosterSize","defaultPositions","statCategories","defaultBenchSlots","defaultRosterSlots")
VALUES (gen_random_uuid()::TEXT,'SOCCER','Soccer — UEFA European','soccer','weekly','points','points',38,34,4,7,'per_match_kickoff',true,true,15,'{"GK":1,"DEF":4,"MID":4,"FWD":2}'::jsonb,'["goals","assists","clean_sheets","saves","goals_conceded","yellow_cards","red_cards","minutes_played"]'::jsonb,4,NULL)
ON CONFLICT ("sport") DO UPDATE SET
  "displayName"='Soccer — UEFA European', "slug"='soccer',
  "supportsRedraft"=true, "supportsKeeper"=true, "updatedAt"=NOW();
