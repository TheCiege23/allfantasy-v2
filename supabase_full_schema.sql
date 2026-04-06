-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "FeedbackReason" AS ENUM ('OVERVALUED', 'TOO_RISKY', 'NOT_MY_STYLE', 'BAD_ROSTER_FIT', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "VoteType" AS ENUM ('UP', 'DOWN');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "TradeOfferMode" AS ENUM ('INSTANT', 'STRUCTURED', 'TRADE_HUB', 'TRADE_IDEAS', 'PROPOSAL_GENERATOR');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "TradeOutcome" AS ENUM ('ACCEPTED', 'REJECTED', 'EXPIRED', 'COUNTERED', 'UNKNOWN');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "VerificationMethod" AS ENUM ('EMAIL', 'PHONE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "LeagueSport" AS ENUM ('NFL', 'NHL', 'MLB', 'NBA', 'NCAAF', 'NCAAB', 'SOCCER');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "EarlyAccessSignup" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "source" TEXT DEFAULT 'allfantasy.ai',
    "referrer" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmMedium" TEXT,
    "utmSource" TEXT,
    "utmTerm" TEXT,

    CONSTRAINT "EarlyAccessSignup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "VisitorLocation" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "countryCode" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "visits" INTEGER NOT NULL DEFAULT 1,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "QuestionnaireResponse" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "favoriteSport" TEXT NOT NULL,
    "favoriteLeagueType" TEXT NOT NULL,
    "competitiveness" TEXT NOT NULL,
    "draftPreference" TEXT NOT NULL,
    "painPoint" TEXT NOT NULL,
    "experimentalInterest" TEXT[],
    "freeText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionnaireResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SportsDataCache" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SportsDataCache_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SportsTeam" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "city" TEXT,
    "conference" TEXT,
    "division" TEXT,
    "logo" TEXT,
    "primaryColor" TEXT,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportsTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SportsPlayer" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "team" TEXT,
    "teamId" TEXT,
    "number" INTEGER,
    "age" INTEGER,
    "height" TEXT,
    "weight" TEXT,
    "college" TEXT,
    "imageUrl" TEXT,
    "sleeperId" TEXT,
    "dob" TEXT,
    "status" TEXT,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportsPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PlayerIdentityMap" (
    "id" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "position" TEXT,
    "currentTeam" TEXT,
    "dob" TEXT,
    "sleeperId" TEXT,
    "fantasyCalcId" TEXT,
    "rollingInsightsId" TEXT,
    "apiSportsId" TEXT,
    "mflId" TEXT,
    "espnId" TEXT,
    "fleaflickerId" TEXT,
    "clearSportsId" TEXT,
    "sport" TEXT NOT NULL DEFAULT 'NFL',
    "status" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerIdentityMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "player_team_history" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "sport" TEXT NOT NULL DEFAULT 'nfl',
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL DEFAULT 0,
    "teamAbbr" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'sleeper',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_team_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SportsGame" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "homeTeamId" TEXT,
    "awayTeam" TEXT NOT NULL,
    "awayTeamId" TEXT,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "status" TEXT,
    "startTime" TIMESTAMP(3),
    "venue" TEXT,
    "week" INTEGER,
    "season" INTEGER,
    "source" TEXT NOT NULL,
    "raw" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportsGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SportsInjury" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "playerId" TEXT,
    "team" TEXT,
    "teamId" TEXT,
    "position" TEXT,
    "type" TEXT,
    "status" TEXT,
    "description" TEXT,
    "date" TIMESTAMP(3),
    "season" INTEGER,
    "week" INTEGER,
    "source" TEXT NOT NULL,
    "raw" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportsInjury_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SportsNews" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceUrl" TEXT,
    "author" TEXT,
    "imageUrl" TEXT,
    "playerName" TEXT,
    "playerNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "playerId" TEXT,
    "team" TEXT,
    "teams" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "sentiment" TEXT,
    "publishedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportsNews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sports_players" (
    "id" VARCHAR(128) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "team" VARCHAR(32) NOT NULL,
    "position" VARCHAR(32) NOT NULL,
    "stats" JSONB NOT NULL,
    "projections" JSONB NOT NULL,
    "adp" DOUBLE PRECISION,
    "dynasty_value" INTEGER,
    "injury_status" VARCHAR(32),
    "injury_notes" TEXT,
    "news" JSONB,
    "headshot_url" TEXT,
    "headshot_url_sm" TEXT,
    "headshot_url_lg" TEXT,
    "headshot_source" VARCHAR(32),
    "logo_url" TEXT,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_source" VARCHAR(32) NOT NULL,

    CONSTRAINT "sports_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "team_assets" (
    "id" TEXT NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "team_code" VARCHAR(32) NOT NULL,
    "team_name" VARCHAR(128) NOT NULL,
    "logo_url" TEXT,
    "logo_url_sm" TEXT,
    "logo_url_lg" TEXT,
    "logo_source" VARCHAR(32),
    "primary_color" VARCHAR(32),
    "secondary_color" VARCHAR(32),
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "injury_reports" (
    "id" TEXT NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "player_id" VARCHAR(128) NOT NULL,
    "player_name" VARCHAR(128) NOT NULL,
    "team" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "body_part" VARCHAR(64),
    "notes" TEXT,
    "practice" VARCHAR(32),
    "game_status" VARCHAR(32),
    "report_date" TIMESTAMP(3) NOT NULL,
    "week" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "injury_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "adp_data" (
    "id" TEXT NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "format" VARCHAR(32) NOT NULL,
    "scoring" VARCHAR(32) NOT NULL,
    "player_id" VARCHAR(128) NOT NULL,
    "player_name" VARCHAR(128) NOT NULL,
    "position" VARCHAR(32) NOT NULL,
    "team" VARCHAR(32) NOT NULL,
    "adp" DOUBLE PRECISION NOT NULL,
    "adp_change" DOUBLE PRECISION,
    "week" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "source" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adp_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "player_news" (
    "id" TEXT NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "player_id" VARCHAR(128),
    "player_name" VARCHAR(128) NOT NULL,
    "team" VARCHAR(32),
    "headline" VARCHAR(256) NOT NULL,
    "body" TEXT NOT NULL,
    "impact" VARCHAR(16) NOT NULL,
    "fantasy_relevant" BOOLEAN NOT NULL DEFAULT false,
    "source" VARCHAR(32) NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "api_rate_limits" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "endpoint" VARCHAR(128) NOT NULL,
    "calls_made" INTEGER NOT NULL DEFAULT 0,
    "calls_limit" INTEGER NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "api_call_log" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "endpoint" VARCHAR(128) NOT NULL,
    "status" INTEGER NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "error" TEXT,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "called_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_call_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LegacyUser" (
    "id" TEXT NOT NULL,
    "sleeperUsername" TEXT NOT NULL,
    "sleeperUserId" TEXT NOT NULL,
    "displayName" TEXT,
    "avatar" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "legacy_user_rank_cache" (
    "legacy_user_id" TEXT NOT NULL,
    "career_xp" BIGINT NOT NULL DEFAULT 0,
    "career_level" INTEGER NOT NULL DEFAULT 0,
    "career_tier" INTEGER NOT NULL DEFAULT 1,
    "career_tier_name" TEXT NOT NULL DEFAULT 'Practice Squad',
    "baseline_year_xp" BIGINT NOT NULL DEFAULT 0,
    "ai_low_year_xp" BIGINT NOT NULL DEFAULT 0,
    "ai_mid_year_xp" BIGINT NOT NULL DEFAULT 0,
    "ai_high_year_xp" BIGINT NOT NULL DEFAULT 0,
    "assumptions_json" JSONB NOT NULL DEFAULT '{}',
    "last_calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_refresh_at" TIMESTAMP(3),
    "computed_from_import_completed_at" TIMESTAMP(3),
    "rank_import_count" INTEGER NOT NULL DEFAULT 0,
    "rank_sources" JSONB,
    "last_rank_reset_at" TIMESTAMP(3),

    CONSTRAINT "legacy_user_rank_cache_pkey" PRIMARY KEY ("legacy_user_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PlatformIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "platformUsername" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "sport" TEXT NOT NULL DEFAULT 'nfl',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "firstImportAt" TIMESTAMP(3),
    "rankLocked" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LegacyImportJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentSeason" INTEGER,
    "emptyYears" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LegacyLeague" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sleeperLeagueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "sport" TEXT NOT NULL DEFAULT 'nfl',
    "leagueType" TEXT,
    "scoringType" TEXT,
    "teamCount" INTEGER,
    "status" TEXT,
    "draftId" TEXT,
    "winnerRosterId" INTEGER,
    "playoffTeams" INTEGER,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "specialtyFormat" TEXT,
    "isSF" BOOLEAN NOT NULL DEFAULT false,
    "isTEP" BOOLEAN NOT NULL DEFAULT false,
    "tepBonus" DOUBLE PRECISION,

    CONSTRAINT "LegacyLeague_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LegacyRoster" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" INTEGER NOT NULL DEFAULT 0,
    "ownerId" TEXT,
    "ownerName" TEXT,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsAgainst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "playoffSeed" INTEGER,
    "finalStanding" INTEGER,
    "isChampion" BOOLEAN NOT NULL DEFAULT false,
    "players" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyRoster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LegacySeasonSummary" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" INTEGER NOT NULL DEFAULT 0,
    "champion" BOOLEAN NOT NULL DEFAULT false,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalRank" INTEGER,
    "championUserId" TEXT,
    "championName" TEXT,
    "regularSeasonMVP" TEXT,
    "highestScorer" TEXT,
    "highestScore" DOUBLE PRECISION,
    "averageScore" DOUBLE PRECISION,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacySeasonSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LegacyAIReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "rating" INTEGER,
    "title" TEXT,
    "summary" TEXT,
    "insights" JSONB,
    "shareText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegacyAIReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "path" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "userId" TEXT,
    "emailHash" TEXT,
    "toolKey" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TradeNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "sleeperLeagueId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "type" TEXT NOT NULL DEFAULT 'trade',
    "senderRosterId" INTEGER NOT NULL,
    "senderName" TEXT,
    "receiverRosterId" INTEGER NOT NULL,
    "receiverName" TEXT,
    "playersGiven" JSONB NOT NULL DEFAULT '[]',
    "playersReceived" JSONB NOT NULL DEFAULT '[]',
    "picksGiven" JSONB NOT NULL DEFAULT '[]',
    "picksReceived" JSONB NOT NULL DEFAULT '[]',
    "aiGrade" TEXT,
    "aiVerdict" TEXT,
    "aiAnalysis" JSONB,
    "aiAnalyzedAt" TIMESTAMP(3),
    "sleeperCreatedAt" TIMESTAMP(3),
    "seenAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EmailPreference" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "legacyUserId" TEXT,
    "sleeperUsername" TEXT,
    "tradeAlerts" BOOLEAN NOT NULL DEFAULT true,
    "weeklyDigest" BOOLEAN NOT NULL DEFAULT false,
    "productUpdates" BOOLEAN NOT NULL DEFAULT true,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AIUserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sleeperUsername" TEXT,
    "toneMode" TEXT NOT NULL DEFAULT 'professional',
    "detailLevel" TEXT NOT NULL DEFAULT 'concise',
    "riskMode" TEXT NOT NULL DEFAULT 'conservative',
    "humorLevel" TEXT NOT NULL DEFAULT 'medium',
    "strategyBias" JSONB NOT NULL DEFAULT '{"qb_priority": 0.5, "rb_aversion": 0.3, "prefers_picks": 0.5, "prefers_youth": 0.5}',
    "behaviorMetrics" JSONB NOT NULL DEFAULT '{"draft_reach_tendency": null, "trade_rate_percentile": null, "waiver_rate_percentile": null}',
    "personalizeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tradePreferenceProfile" TEXT,
    "tradeProfileUpdatedAt" TIMESTAMP(3),
    "tradeProfileVoteCount" INTEGER NOT NULL DEFAULT 0,
    "tradeProfileVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIUserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "trade_suggestion_votes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tradeText" TEXT NOT NULL,
    "suggestionTitle" TEXT NOT NULL,
    "suggestionText" TEXT,
    "vote" TEXT NOT NULL,
    "reason" TEXT,
    "feedbackReason" "FeedbackReason",
    "leagueSize" INTEGER,
    "isDynasty" BOOLEAN,
    "scoring" TEXT,
    "userRoster" TEXT,
    "userContention" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_suggestion_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "trade_feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tradeText" TEXT,
    "suggestionTitle" TEXT,
    "suggestionText" TEXT,
    "vote" "VoteType" NOT NULL,
    "reason" "FeedbackReason",
    "leagueSize" INTEGER,
    "isDynasty" BOOLEAN,
    "scoring" TEXT,
    "userContention" TEXT,
    "userRoster" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "trade_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "lastSummarizedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AILeagueContext" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "sport" TEXT NOT NULL DEFAULT 'NFL',
    "format" TEXT NOT NULL DEFAULT 'dynasty',
    "sfEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tepPremium" BOOLEAN NOT NULL DEFAULT false,
    "scoringSettings" JSONB,
    "rosterSettings" JSONB,
    "phase" TEXT NOT NULL DEFAULT 'offseason',
    "marketBaselines" JSONB NOT NULL DEFAULT '{"qb_price_index": 1.0, "rb_price_index": 1.0, "pick_liquidity_index": 1.0}',
    "lastComputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AILeagueContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AITeamStateSnapshot" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "sleeperUsername" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowStatus" TEXT NOT NULL DEFAULT 'middle',
    "winNowScore" INTEGER NOT NULL DEFAULT 50,
    "futureValueScore" INTEGER NOT NULL DEFAULT 50,
    "qbStabilityScore" INTEGER NOT NULL DEFAULT 50,
    "rbDependencyScore" INTEGER NOT NULL DEFAULT 50,
    "pickInventory" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AITeamStateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_memories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT '',
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AIMemoryEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "leagueId" TEXT,
    "teamId" TEXT,
    "eventType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMemoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AIUserFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT,
    "actionType" TEXT NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUserFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TradeFeedback" (
    "id" TEXT NOT NULL,
    "sleeperUsername" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "leagueName" TEXT,
    "targetManager" TEXT NOT NULL,
    "youGive" TEXT[],
    "youReceive" TEXT[],
    "aiGrade" TEXT,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TradePreferences" (
    "id" TEXT NOT NULL,
    "sleeperUsername" TEXT NOT NULL,
    "youthVsProduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "consolidationVsDepth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "picksVsPlayers" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskTolerance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qbPriority" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tePriority" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quizCompleted" BOOLEAN NOT NULL DEFAULT false,
    "quizResponses" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradePreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LeagueTradeHistory" (
    "id" TEXT NOT NULL,
    "sleeperLeagueId" TEXT NOT NULL,
    "sleeperUsername" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tradesLoaded" INTEGER NOT NULL DEFAULT 0,
    "totalTradesFound" INTEGER NOT NULL DEFAULT 0,
    "lastWeekFetched" INTEGER NOT NULL DEFAULT 0,
    "tradingStyle" JSONB,
    "favoriteTargets" JSONB,
    "avoidedAssets" JSONB,
    "tradeFrequency" TEXT,
    "notifiedComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueTradeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LeagueTrade" (
    "id" TEXT NOT NULL,
    "historyId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "playersGiven" JSONB NOT NULL DEFAULT '[]',
    "picksGiven" JSONB NOT NULL DEFAULT '[]',
    "playersReceived" JSONB NOT NULL DEFAULT '[]',
    "picksReceived" JSONB NOT NULL DEFAULT '[]',
    "partnerRosterId" INTEGER,
    "partnerName" TEXT,
    "valueGiven" DOUBLE PRECISION,
    "valueReceived" DOUBLE PRECISION,
    "tradeDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analysisResult" JSONB,
    "analyzed" BOOLEAN NOT NULL DEFAULT false,
    "isSuperFlex" BOOLEAN,
    "leagueFormat" TEXT,
    "scoringType" TEXT,
    "valueDifferential" DOUBLE PRECISION,
    "dynastyTierScore" DOUBLE PRECISION,
    "performanceData" JSONB,
    "platform" TEXT NOT NULL DEFAULT 'sleeper',
    "playerAgeData" JSONB,
    "sport" TEXT NOT NULL DEFAULT 'nfl',

    CONSTRAINT "LeagueTrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TradeLearningInsight" (
    "id" TEXT NOT NULL,
    "insightType" TEXT NOT NULL,
    "playerName" TEXT,
    "position" TEXT,
    "ageRange" TEXT,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "avgValueGiven" DOUBLE PRECISION,
    "avgValueReceived" DOUBLE PRECISION,
    "winRate" DOUBLE PRECISION,
    "marketTrend" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "insightText" TEXT,
    "examples" JSONB,
    "season" INTEGER NOT NULL DEFAULT 2025,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "platform" TEXT,
    "sport" TEXT,

    CONSTRAINT "TradeLearningInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TradeLearningStats" (
    "id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "totalTradesAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "totalUsersContributing" INTEGER NOT NULL DEFAULT 0,
    "avgValueDifferential" DOUBLE PRECISION,
    "mostOvervaluedPlayers" JSONB,
    "mostUndervaluedPlayers" JSONB,
    "positionTrends" JSONB,
    "pickValueObserved" JSONB,
    "ageCurveData" JSONB,
    "calibratedB0" DOUBLE PRECISION,
    "calibrationSampleSize" INTEGER NOT NULL DEFAULT 0,
    "calibrationHistory" JSONB,
    "feedbackWeightAdj" JSONB,
    "driftReport" JSONB,
    "shadowB0" DOUBLE PRECISION,
    "shadowB0SampleSize" INTEGER,
    "shadowB0ComputedAt" TIMESTAMP(3),
    "shadowB0Metrics" JSONB,
    "segmentB0s" JSONB,
    "isotonicMapJson" JSONB,
    "isotonicComputedAt" TIMESTAMP(3),
    "isotonicSampleSize" INTEGER,
    "lastRecalibrationAt" TIMESTAMP(3),
    "lastCalibrated" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeLearningStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TradePreAnalysisCache" (
    "id" TEXT NOT NULL,
    "sleeperUsername" TEXT NOT NULL,
    "sleeperLeagueId" TEXT NOT NULL,
    "leagueName" TEXT,
    "leagueSettings" JSONB,
    "userTradingProfile" JSONB,
    "leagueTradePatterns" JSONB,
    "managerProfiles" JSONB,
    "managerTendencyProfiles" JSONB,
    "rosterNeeds" JSONB,
    "marketInsights" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "analysisStartedAt" TIMESTAMP(3),
    "analysisCompletedAt" TIMESTAMP(3),
    "tendencyComputedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradePreAnalysisCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LeagueTypeSubmission" (
    "id" TEXT NOT NULL,
    "leagueTypeName" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sports" TEXT[],
    "recommendedSize" TEXT NOT NULL,
    "seasonFormat" TEXT NOT NULL,
    "draftType" TEXT NOT NULL,
    "winCondition" TEXT NOT NULL,
    "hasSpecialScoring" BOOLEAN NOT NULL DEFAULT false,
    "scoringRules" TEXT,
    "positionsImpacted" TEXT,
    "specialMechanics" TEXT[],
    "weeklyFlow" TEXT NOT NULL,
    "edgeCases" TEXT,
    "rosterSetup" TEXT,
    "waiverSystem" TEXT,
    "tradeRules" TEXT,
    "playoffSetup" TEXT,
    "commissionerTools" TEXT,
    "creditName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "socialHandle" TEXT,
    "permissionConsent" BOOLEAN NOT NULL DEFAULT false,
    "rightsConsent" BOOLEAN NOT NULL DEFAULT false,
    "canContact" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'received',
    "adminNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueTypeSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LegacyFeedback" (
    "id" TEXT NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "feedbackText" TEXT NOT NULL,
    "stepsToReproduce" TEXT,
    "rating" INTEGER,
    "importance" TEXT,
    "wasLoggedIn" BOOLEAN,
    "device" TEXT,
    "browser" TEXT,
    "email" TEXT,
    "canContact" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "sleeperUsername" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "adminNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aiCategory" TEXT,
    "aiReproSteps" TEXT,
    "aiSeverity" TEXT,
    "aiSuggestedFix" TEXT,
    "aiSummary" TEXT,
    "aiSuspectedCause" TEXT,
    "aiTriagedAt" TIMESTAMP(3),
    "assignedTo" TEXT,
    "pageUrl" TEXT,
    "priority" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "screenshotMeta" TEXT,
    "screenshotUrl" TEXT,

    CONSTRAINT "LegacyFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "YahooConnection" (
    "id" TEXT NOT NULL,
    "yahooUserId" TEXT NOT NULL,
    "displayName" TEXT,
    "email" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YahooConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "YahooLeague" (
    "id" TEXT NOT NULL,
    "yahooLeagueKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "numTeams" INTEGER,
    "leagueType" TEXT,
    "draftStatus" TEXT,
    "currentWeek" INTEGER,
    "startWeek" INTEGER,
    "endWeek" INTEGER,
    "isFinished" BOOLEAN NOT NULL DEFAULT false,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "connectionId" TEXT NOT NULL,

    CONSTRAINT "YahooLeague_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "YahooTeam" (
    "id" TEXT NOT NULL,
    "yahooTeamKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "managerName" TEXT,
    "logoUrl" TEXT,
    "waiverPriority" INTEGER,
    "faabBalance" INTEGER,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsAgainst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "standing" INTEGER,
    "playoffSeed" INTEGER,
    "isUserTeam" BOOLEAN NOT NULL DEFAULT false,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "leagueId" TEXT NOT NULL,

    CONSTRAINT "YahooTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MFLConnection" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "mflUsername" TEXT NOT NULL,
    "mflCookie" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MFLConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InsightEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "insightId" TEXT,
    "insightType" TEXT,
    "confidenceLevel" TEXT,
    "confidenceScore" TEXT,
    "leagueId" TEXT,
    "sport" TEXT,
    "scoringType" TEXT,
    "dataCoverage" TEXT,
    "placement" TEXT,
    "userId" TEXT,
    "feedbackType" TEXT,
    "feedbackText" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsightEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AIIssue" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "area" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'low',
    "status" TEXT NOT NULL DEFAULT 'open',
    "avgConfidence" DOUBLE PRECISION,
    "reportCount" INTEGER NOT NULL DEFAULT 1,
    "feltOffRate" DOUBLE PRECISION,
    "sport" TEXT,
    "leagueType" TEXT,
    "aiSelfAssessment" TEXT,
    "tags" TEXT[],
    "resolutionSummary" TEXT,
    "resolutionType" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AIIssueFeedback" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "feedbackText" TEXT NOT NULL,
    "feedbackType" TEXT,
    "confidenceLevel" TEXT,
    "sport" TEXT,
    "leagueType" TEXT,
    "insightType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIIssueFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FantraxUser" (
    "id" TEXT NOT NULL,
    "fantraxUsername" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FantraxUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FantraxLeague" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueName" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "sport" TEXT NOT NULL DEFAULT 'cfb',
    "teamCount" INTEGER NOT NULL DEFAULT 12,
    "userTeam" TEXT NOT NULL,
    "isChampion" BOOLEAN NOT NULL DEFAULT false,
    "champion" TEXT,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsAgainst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalRank" INTEGER,
    "playoffFinish" TEXT,
    "standings" JSONB,
    "matchups" JSONB,
    "roster" JSONB,
    "teamStats" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDevy" BOOLEAN NOT NULL DEFAULT false,
    "transactions" JSONB,

    CONSTRAINT "FantraxLeague_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "manager_trade_tendencies" (
    "user_id" TEXT NOT NULL,
    "leagues_played" INTEGER DEFAULT 0,
    "trades_sent" INTEGER DEFAULT 0,
    "trades_accepted" INTEGER DEFAULT 0,
    "avg_overpay_ratio" DOUBLE PRECISION DEFAULT 1.0,
    "prefers_youth" BOOLEAN DEFAULT false,
    "prefers_picks" BOOLEAN DEFAULT false,
    "risk_tolerance" TEXT DEFAULT 'medium',
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_trade_tendencies_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_trade_reputation" (
    "user_id" TEXT NOT NULL,
    "trades_sent" INTEGER DEFAULT 0,
    "trades_accepted" INTEGER DEFAULT 0,
    "avg_value_delta" DOUBLE PRECISION DEFAULT 1.0,
    "reputation" TEXT DEFAULT 'Fair Dealer',
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_trade_reputation_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SleeperImportCache" (
    "id" TEXT NOT NULL,
    "sleeperUsername" VARCHAR(64) NOT NULL,
    "sleeperLeagueId" VARCHAR(64) NOT NULL,
    "leagueName" VARCHAR(255),
    "leagueContext" JSONB NOT NULL,
    "managerRosters" JSONB NOT NULL,
    "fantasyCalcValueMap" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SleeperImportCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "trade_block_entries" (
    "id" TEXT NOT NULL,
    "sleeperLeagueId" VARCHAR(64) NOT NULL,
    "rosterId" INTEGER NOT NULL,
    "playerId" VARCHAR(32) NOT NULL,
    "playerName" VARCHAR(128) NOT NULL,
    "position" VARCHAR(16),
    "team" VARCHAR(8),
    "createdByUsername" VARCHAR(64) NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_block_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "trade_analysis_snapshots" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sleeperUsername" VARCHAR(64) NOT NULL,
    "snapshotType" VARCHAR(32) NOT NULL,
    "contextKey" VARCHAR(64),
    "payloadJson" JSONB NOT NULL,
    "season" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_analysis_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "share_rewards" (
    "id" TEXT NOT NULL,
    "sleeperUsername" VARCHAR(64) NOT NULL,
    "leagueId" VARCHAR(64),
    "shareType" VARCHAR(32) NOT NULL,
    "shareContent" JSONB,
    "tokensAwarded" INTEGER NOT NULL DEFAULT 1,
    "platform" VARCHAR(32),
    "redeemed" BOOLEAN NOT NULL DEFAULT false,
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "decision_logs" (
    "id" TEXT NOT NULL,
    "userId" VARCHAR(64) NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "decisionType" VARCHAR(32) NOT NULL,
    "aiRecommendation" JSONB NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "numericConfidence" INTEGER,
    "riskProfile" VARCHAR(32) NOT NULL,
    "volatilityLabel" VARCHAR(16),
    "volatilityScore" DOUBLE PRECISION,
    "riskTags" JSONB,
    "confidenceExplanation" TEXT,
    "contextSnapshot" JSONB,
    "userFollowed" BOOLEAN,
    "userAction" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decision_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "decision_outcomes" (
    "id" TEXT NOT NULL,
    "decisionLogId" TEXT NOT NULL,
    "rosterValueBefore" DOUBLE PRECISION,
    "rosterValueAfter" DOUBLE PRECISION,
    "rosterValueDelta" DOUBLE PRECISION,
    "winProbBefore" DOUBLE PRECISION,
    "winProbAfter" DOUBLE PRECISION,
    "winProbDelta" DOUBLE PRECISION,
    "evaluationWeeks" INTEGER NOT NULL DEFAULT 3,
    "actualResult" VARCHAR(32),
    "outcomeGrade" VARCHAR(8),
    "aiRetroSummary" TEXT,
    "detailJson" JSONB,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TradeOfferEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode" "TradeOfferMode" NOT NULL,
    "season" INTEGER,
    "week" INTEGER,
    "leagueId" VARCHAR(64),
    "senderUserId" VARCHAR(64),
    "opponentUserId" VARCHAR(64),
    "inputHash" TEXT NOT NULL,
    "assetsGiven" JSONB NOT NULL DEFAULT '[]',
    "assetsReceived" JSONB NOT NULL DEFAULT '[]',
    "acceptProb" DOUBLE PRECISION NOT NULL,
    "verdict" VARCHAR(32) NOT NULL,
    "lean" VARCHAR(32) NOT NULL,
    "grade" VARCHAR(16),
    "confidenceScore" INTEGER,
    "confidenceLabel" VARCHAR(32),
    "featuresJson" JSONB NOT NULL,
    "driversJson" JSONB NOT NULL,
    "confidenceDriversJson" JSONB NOT NULL,
    "narrativeValid" BOOLEAN NOT NULL DEFAULT true,
    "driverSetComplete" BOOLEAN NOT NULL DEFAULT true,
    "isSuperFlex" BOOLEAN,
    "leagueFormat" VARCHAR(32),
    "scoringType" VARCHAR(16),
    "leagueTradeId" TEXT,
    "modelVersion" VARCHAR(32),

    CONSTRAINT "TradeOfferEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TradeOutcomeEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leagueId" VARCHAR(64),
    "season" INTEGER,
    "week" INTEGER,
    "offerEventId" VARCHAR(64),
    "leagueTradeId" TEXT,
    "outcome" "TradeOutcome" NOT NULL,
    "timeToDecisionMin" INTEGER,
    "outcomeMetaJson" JSONB,

    CONSTRAINT "TradeOutcomeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ModelMetricsDaily" (
    "id" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "mode" "TradeOfferMode" NOT NULL,
    "segmentKey" VARCHAR(64) NOT NULL,
    "nOffers" INTEGER NOT NULL,
    "nLabeled" INTEGER NOT NULL,
    "nAccepted" INTEGER NOT NULL,
    "meanPred" DOUBLE PRECISION NOT NULL,
    "meanObs" DOUBLE PRECISION NOT NULL,
    "ece" DOUBLE PRECISION NOT NULL,
    "brier" DOUBLE PRECISION NOT NULL,
    "auc" DOUBLE PRECISION,
    "psiJson" JSONB,
    "capRateJson" JSONB,
    "bucketStatsJson" JSONB,
    "narrativeFailRate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ModelMetricsDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LearnedWeights" (
    "id" TEXT NOT NULL,
    "leagueClass" VARCHAR(16) NOT NULL,
    "season" INTEGER NOT NULL,
    "wMarket" DOUBLE PRECISION NOT NULL,
    "wImpact" DOUBLE PRECISION NOT NULL,
    "wScarcity" DOUBLE PRECISION NOT NULL,
    "wDemand" DOUBLE PRECISION NOT NULL,
    "nTrades" INTEGER NOT NULL,
    "corrMarket" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "corrImpact" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "corrScarcity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "corrDemand" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearnedWeights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RankingWeightsWeekly" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "segmentKey" VARCHAR(32) NOT NULL,
    "priorJson" JSONB NOT NULL,
    "learnedJson" JSONB NOT NULL,
    "finalJson" JSONB NOT NULL,
    "metricsJson" JSONB NOT NULL DEFAULT '{}',
    "compositeParamsJson" JSONB,
    "status" VARCHAR(32) NOT NULL,
    "version" VARCHAR(48) NOT NULL,
    "nSamples" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingWeightsWeekly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LeagueDemandWeekly" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "rangeDays" INTEGER NOT NULL DEFAULT 90,
    "positionDemand" JSONB NOT NULL DEFAULT '[]',
    "pickDemand" JSONB NOT NULL DEFAULT '[]',
    "hotPlayers" JSONB NOT NULL DEFAULT '[]',
    "demandByPosition" JSONB NOT NULL DEFAULT '{}',
    "tradesAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueDemandWeekly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "NarrativeValidationLog" (
    "id" TEXT NOT NULL,
    "offerEventId" VARCHAR(64),
    "mode" VARCHAR(32) NOT NULL,
    "contractType" VARCHAR(32) NOT NULL,
    "valid" BOOLEAN NOT NULL,
    "violations" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NarrativeValidationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "pecr_logs" (
    "id" TEXT NOT NULL,
    "feature" VARCHAR(64) NOT NULL,
    "intent" VARCHAR(64) NOT NULL,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "context" JSONB,
    "refineHints" JSONB NOT NULL DEFAULT '[]',
    "iterations" INTEGER NOT NULL,
    "maxIterations" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "allFailures" JSONB NOT NULL DEFAULT '[]',
    "durationMs" INTEGER NOT NULL,
    "outputPreview" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pecr_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_codebase_edits" (
    "id" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "linesAdded" INTEGER NOT NULL DEFAULT 0,
    "linesRemoved" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ai_codebase_edits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_repo_memory" (
    "id" TEXT NOT NULL,
    "memory" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_repo_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "manager_dna" (
    "id" TEXT NOT NULL,
    "sleeperUsername" TEXT NOT NULL,
    "sleeperUserId" VARCHAR(64),
    "archetype" VARCHAR(64) NOT NULL,
    "secondaryArchetype" VARCHAR(64),
    "metrics" JSONB NOT NULL,
    "strengths" JSONB NOT NULL DEFAULT '[]',
    "blindSpots" JSONB NOT NULL DEFAULT '[]',
    "recommendations" JSONB NOT NULL DEFAULT '[]',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tradeCount" INTEGER NOT NULL DEFAULT 0,
    "waiverCount" INTEGER NOT NULL DEFAULT 0,
    "seasonsCovered" INTEGER NOT NULL DEFAULT 0,
    "lastComputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_dna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "opponent_tendencies" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "rosterId" INTEGER NOT NULL,
    "username" VARCHAR(64),
    "displayName" VARCHAR(128),
    "tendencies" JSONB NOT NULL,
    "tradeLikelihood" JSONB NOT NULL DEFAULT '{}',
    "pitchAngles" JSONB NOT NULL DEFAULT '[]',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tradeCount" INTEGER NOT NULL DEFAULT 0,
    "seasonsCovered" INTEGER NOT NULL DEFAULT 0,
    "lastComputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opponent_tendencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "strategy_snapshots" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "rosterId" INTEGER NOT NULL,
    "season" VARCHAR(8) NOT NULL,
    "sleeperUsername" VARCHAR(64),
    "classification" VARCHAR(32) NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metrics" JSONB NOT NULL,
    "roster" JSONB NOT NULL DEFAULT '{}',
    "standings" JSONB NOT NULL DEFAULT '{}',
    "draftCapital" JSONB NOT NULL DEFAULT '[]',
    "phases" JSONB NOT NULL DEFAULT '[]',
    "tradeWindows" JSONB NOT NULL DEFAULT '[]',
    "riskPoints" JSONB NOT NULL DEFAULT '[]',
    "aiRoadmap" TEXT,
    "weekNumber" INTEGER NOT NULL DEFAULT 0,
    "lastComputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategy_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "player_season_stats" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "seasonType" TEXT NOT NULL DEFAULT 'regular',
    "position" TEXT,
    "team" TEXT,
    "stats" JSONB NOT NULL,
    "gamesPlayed" INTEGER,
    "fantasyPoints" DOUBLE PRECISION,
    "fantasyPointsPerGame" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_season_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "trending_players" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL DEFAULT 'nfl',
    "sleeperId" TEXT NOT NULL,
    "playerName" TEXT,
    "position" TEXT,
    "team" TEXT,
    "addCount" INTEGER NOT NULL DEFAULT 0,
    "dropCount" INTEGER NOT NULL DEFAULT 0,
    "netTrend" INTEGER NOT NULL DEFAULT 0,
    "addRank" INTEGER,
    "dropRank" INTEGER,
    "crowdSignal" TEXT NOT NULL DEFAULT 'neutral',
    "crowdScore" INTEGER NOT NULL DEFAULT 50,
    "lookbackHours" INTEGER NOT NULL DEFAULT 24,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trending_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "depth_charts" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "teamId" TEXT,
    "position" TEXT NOT NULL,
    "players" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "season" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "depth_charts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "team_season_stats" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "teamId" TEXT,
    "season" TEXT NOT NULL,
    "seasonType" TEXT NOT NULL DEFAULT 'regular',
    "stats" JSONB NOT NULL,
    "wins" INTEGER,
    "losses" INTEGER,
    "ties" INTEGER,
    "pointsFor" INTEGER,
    "pointsAgainst" INTEGER,
    "totalYards" INTEGER,
    "passingYards" INTEGER,
    "rushingYards" INTEGER,
    "turnovers" INTEGER,
    "sacks" DOUBLE PRECISION,
    "fantasyPoints" DOUBLE PRECISION,
    "gamesPlayed" INTEGER,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_season_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProviderSyncState" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "sport" TEXT,
    "entityType" TEXT NOT NULL,
    "key" TEXT,
    "lastStartedAt" TIMESTAMP(3),
    "lastCompletedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastError" TEXT,
    "recordsImported" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "lastPayloadBytes" INTEGER NOT NULL DEFAULT 0,
    "fallbackProvider" TEXT,
    "sourcePriority" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AiOutput" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "model" TEXT,
    "contentText" TEXT,
    "contentJson" JSONB,
    "confidence" DOUBLE PRECISION,
    "meta" JSONB,
    "tokensPrompt" INTEGER,
    "tokensCompletion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "guardian_interventions" (
    "id" TEXT NOT NULL,
    "userId" VARCHAR(64) NOT NULL,
    "leagueId" VARCHAR(64),
    "actionType" VARCHAR(32) NOT NULL,
    "severity" VARCHAR(16) NOT NULL,
    "userAction" JSONB NOT NULL,
    "aiRecommendation" JSONB NOT NULL,
    "expectedValueLoss" DOUBLE PRECISION,
    "deviationScore" DOUBLE PRECISION NOT NULL,
    "riskFactors" JSONB,
    "confidenceScore" INTEGER,
    "userDecision" VARCHAR(16),
    "overrideReason" TEXT,
    "decisionLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardian_interventions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_insights" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sleeperUsername" TEXT,
    "leagueId" TEXT,
    "insightType" VARCHAR(48) NOT NULL,
    "category" VARCHAR(32) NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sleeperUsername" TEXT,
    "badgeType" VARCHAR(48) NOT NULL,
    "badgeName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tier" VARCHAR(16) NOT NULL DEFAULT 'bronze',
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "simulation_runs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sleeperUsername" TEXT,
    "leagueId" TEXT,
    "simulationType" VARCHAR(32) NOT NULL,
    "scenario" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "iterations" INTEGER NOT NULL DEFAULT 1000,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "chat_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sleeperUsername" TEXT,
    "title" TEXT,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataSources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "chat_history" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT,
    "leagueId" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WeeklyMatchup" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "seasonYear" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "rosterId" INTEGER NOT NULL,
    "matchupId" INTEGER,
    "pointsFor" DOUBLE PRECISION NOT NULL,
    "pointsAgainst" DOUBLE PRECISION NOT NULL,
    "win" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyMatchup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "rankings_snapshots" (
    "id" BIGSERIAL NOT NULL,
    "leagueId" TEXT NOT NULL,
    "sport_type" VARCHAR(16),
    "season" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "rosterId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "composite" DECIMAL(10,4) NOT NULL,
    "expectedWins" DECIMAL(10,4),
    "luckDelta" DECIMAL(10,4),
    "metricsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rankings_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "rankings_weights_snapshot" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "weights" JSONB NOT NULL,
    "metrics" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rankings_weights_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "season_results" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "wins" INTEGER,
    "losses" INTEGER,
    "pointsFor" DECIMAL(12,2),
    "pointsAgainst" DECIMAL(12,2),
    "champion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "draft_grades" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "breakdown" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "hall_of_fame" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "championships" INTEGER NOT NULL DEFAULT 0,
    "seasonsPlayed" INTEGER NOT NULL DEFAULT 0,
    "dominance" DECIMAL(10,4) NOT NULL,
    "efficiency" DECIMAL(10,4) NOT NULL,
    "longevity" DECIMAL(10,4) NOT NULL,
    "score" DECIMAL(10,4) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hall_of_fame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "hall_of_fame_entries" (
    "id" TEXT NOT NULL,
    "entityType" VARCHAR(32) NOT NULL,
    "entityId" VARCHAR(128) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "leagueId" VARCHAR(64),
    "season" VARCHAR(16),
    "category" VARCHAR(64) NOT NULL,
    "title" VARCHAR(256) NOT NULL,
    "summary" TEXT,
    "inductedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DECIMAL(10,4) NOT NULL,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "hall_of_fame_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "hall_of_fame_moments" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "season" VARCHAR(16) NOT NULL,
    "headline" VARCHAR(512) NOT NULL,
    "summary" TEXT,
    "relatedManagerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relatedTeamIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relatedMatchupId" VARCHAR(64),
    "significanceScore" DECIMAL(10,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hall_of_fame_moments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "legacy_score_records" (
    "id" TEXT NOT NULL,
    "entityType" VARCHAR(32) NOT NULL,
    "entityId" VARCHAR(128) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "leagueId" VARCHAR(64),
    "overallLegacyScore" DECIMAL(10,4) NOT NULL,
    "championshipScore" DECIMAL(10,4) NOT NULL,
    "playoffScore" DECIMAL(10,4) NOT NULL,
    "consistencyScore" DECIMAL(10,4) NOT NULL,
    "rivalryScore" DECIMAL(10,4) NOT NULL,
    "awardsScore" DECIMAL(10,4) NOT NULL,
    "dynastyScore" DECIMAL(10,4) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legacy_score_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "legacy_evidence_records" (
    "id" TEXT NOT NULL,
    "entityType" VARCHAR(32) NOT NULL,
    "entityId" VARCHAR(128) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "evidenceType" VARCHAR(64) NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "sourceReference" VARCHAR(256),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legacy_evidence_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ApiUsageEvent" (
    "id" BIGSERIAL NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "username" TEXT,
    "leagueId" TEXT,
    "scope" TEXT NOT NULL,
    "tool" TEXT,
    "endpoint" TEXT,
    "method" TEXT,
    "status" INTEGER,
    "ok" BOOLEAN,
    "durationMs" INTEGER,
    "bytesIn" INTEGER,
    "bytesOut" INTEGER,
    "meta" JSONB,

    CONSTRAINT "ApiUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ApiUsageRollup" (
    "id" BIGSERIAL NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "bucketType" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT '',
    "tool" TEXT NOT NULL DEFAULT '',
    "endpoint" TEXT NOT NULL DEFAULT '',
    "leagueId" TEXT NOT NULL DEFAULT '',
    "count" INTEGER NOT NULL DEFAULT 0,
    "okCount" INTEGER NOT NULL DEFAULT 0,
    "errCount" INTEGER NOT NULL DEFAULT 0,
    "avgMs" INTEGER,
    "p95Ms" INTEGER,
    "maxMs" INTEGER,
    "bytesInSum" BIGINT DEFAULT 0,
    "bytesOutSum" BIGINT DEFAULT 0,
    "meta" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiUsageRollup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "team" TEXT,
    "birthYear" INTEGER,
    "league" TEXT NOT NULL,
    "devyEligible" BOOLEAN NOT NULL DEFAULT false,
    "graduatedToNFL" BOOLEAN NOT NULL DEFAULT false,
    "recruitingComposite" DOUBLE PRECISION,
    "breakoutAge" DOUBLE PRECISION,
    "draftProjectionScore" DOUBLE PRECISION,
    "projectedDraftRound" INTEGER,
    "projectedDraftPick" INTEGER,
    "devyAdp" DOUBLE PRECISION,
    "redshirtStatus" BOOLEAN NOT NULL DEFAULT false,
    "transferStatus" BOOLEAN NOT NULL DEFAULT false,
    "nilImpactScore" DOUBLE PRECISION,
    "injurySeverityScore" DOUBLE PRECISION,
    "nflDraftRound" INTEGER,
    "nflDraftPick" INTEGER,
    "nflTeam" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "injuryStatus" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DevyPlayer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "conference" TEXT,
    "sport" VARCHAR(8) NOT NULL DEFAULT 'NCAAF',
    "headshotUrl" TEXT,
    "jerseyNumber" VARCHAR(16),
    "classYearLabel" VARCHAR(16),
    "classYear" INTEGER,
    "heightInches" INTEGER,
    "weightLbs" INTEGER,
    "league" TEXT NOT NULL DEFAULT 'NCAA',
    "devyEligible" BOOLEAN NOT NULL DEFAULT true,
    "graduatedToNFL" BOOLEAN NOT NULL DEFAULT false,
    "draftYear" INTEGER,
    "draftEligibleYear" INTEGER,
    "draftRound" INTEGER,
    "draftPick" INTEGER,
    "draftStatus" TEXT NOT NULL DEFAULT 'college',
    "statusSource" TEXT,
    "statusConfidence" INTEGER NOT NULL DEFAULT 0,
    "statusUpdatedAt" TIMESTAMP(3),
    "lastRosterYear" INTEGER,
    "declaredDraftYear" INTEGER,
    "cfbdId" TEXT,
    "sleeperId" TEXT,
    "nflTeam" TEXT,
    "passingYards" INTEGER,
    "passingTDs" INTEGER,
    "rushingYards" INTEGER,
    "rushingTDs" INTEGER,
    "receivingYards" INTEGER,
    "receivingTDs" INTEGER,
    "receptions" INTEGER,
    "statSeason" INTEGER,
    "devyValue" INTEGER NOT NULL DEFAULT 0,
    "projectedNFLValue" INTEGER,
    "trend" TEXT NOT NULL DEFAULT 'stable',
    "recruitingStars" INTEGER,
    "recruitingRanking" INTEGER,
    "recruitingComposite" DOUBLE PRECISION,
    "breakoutAge" DOUBLE PRECISION,
    "draftProjectionScore" DOUBLE PRECISION,
    "projectedDraftRound" INTEGER,
    "projectedDraftPick" INTEGER,
    "devyAdp" DOUBLE PRECISION,
    "redshirtStatus" BOOLEAN NOT NULL DEFAULT false,
    "transferStatus" BOOLEAN NOT NULL DEFAULT false,
    "transferFromSchool" TEXT,
    "transferToSchool" TEXT,
    "transferEligibility" TEXT,
    "portalStatus" VARCHAR(24),
    "nilImpactScore" DOUBLE PRECISION,
    "injurySeverityScore" DOUBLE PRECISION,
    "athleticProfileScore" DOUBLE PRECISION,
    "productionIndex" DOUBLE PRECISION,
    "volatilityScore" DOUBLE PRECISION,
    "nflDraftRound" INTEGER,
    "nflDraftPick" INTEGER,
    "draftGrade" VARCHAR(24),
    "projectedC2CPoints" DOUBLE PRECISION,
    "c2cPointsSeason" DOUBLE PRECISION,
    "c2cPointsWeek" DOUBLE PRECISION,
    "stockTrendDelta" DOUBLE PRECISION,
    "nextGameLabel" VARCHAR(64),
    "statsPayload" JSONB,
    "usageOverall" DOUBLE PRECISION,
    "usagePass" DOUBLE PRECISION,
    "usageRush" DOUBLE PRECISION,
    "ppaTotal" DOUBLE PRECISION,
    "ppaPass" DOUBLE PRECISION,
    "ppaRush" DOUBLE PRECISION,
    "wepaTotal" DOUBLE PRECISION,
    "wepaPass" DOUBLE PRECISION,
    "wepaRush" DOUBLE PRECISION,
    "returningProdPct" DOUBLE PRECISION,
    "teamSpRating" DOUBLE PRECISION,
    "recruitingCity" TEXT,
    "recruitingState" TEXT,
    "source" TEXT NOT NULL DEFAULT 'cfbd',
    "ncaaSourceTag" VARCHAR(24),
    "lastClassifiedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevyPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DevyAdp" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "adp" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevyAdp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RookieClass" (
    "year" INTEGER NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL,
    "qbDepth" DOUBLE PRECISION NOT NULL,
    "rbDepth" DOUBLE PRECISION NOT NULL,
    "wrDepth" DOUBLE PRECISION NOT NULL,
    "teDepth" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RookieClass_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TradeOutcomeTraining" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "proposerRosterId" TEXT NOT NULL,
    "partnerRosterId" TEXT NOT NULL,
    "fairnessScore" DOUBLE PRECISION NOT NULL,
    "ldiAlignment" DOUBLE PRECISION NOT NULL,
    "needsFitScore" DOUBLE PRECISION NOT NULL,
    "archetypeMatch" DOUBLE PRECISION NOT NULL,
    "dealShapeScore" DOUBLE PRECISION NOT NULL,
    "volatilityDelta" DOUBLE PRECISION NOT NULL,
    "wasAccepted" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeOutcomeTraining_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TradeShare" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "analysis" JSONB NOT NULL,
    "sideA" JSONB NOT NULL,
    "sideB" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EngineSnapshot" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "hash" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngineSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PlayerAnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "status" TEXT,
    "currentTeam" TEXT,
    "season" TEXT NOT NULL,
    "fortyYardDash" DOUBLE PRECISION,
    "twentyYardShuttle" DOUBLE PRECISION,
    "threeConeDrill" DOUBLE PRECISION,
    "benchPress" INTEGER,
    "broadJump" INTEGER,
    "verticalJump" DOUBLE PRECISION,
    "athleticismScore" DOUBLE PRECISION,
    "speedScore" DOUBLE PRECISION,
    "burstScore" DOUBLE PRECISION,
    "agilityScore" DOUBLE PRECISION,
    "sparqX" DOUBLE PRECISION,
    "armLengthIn" DOUBLE PRECISION,
    "handSizeIn" DOUBLE PRECISION,
    "heightIn" INTEGER,
    "weightLb" INTEGER,
    "bmi" DOUBLE PRECISION,
    "catchRadius" DOUBLE PRECISION,
    "throwVelocityMph" DOUBLE PRECISION,
    "breakoutAge" DOUBLE PRECISION,
    "breakoutRating" DOUBLE PRECISION,
    "breakoutYear" INTEGER,
    "college" TEXT,
    "collegeDominatorRating" DOUBLE PRECISION,
    "collegeDynamicScore" DOUBLE PRECISION,
    "collegeLevelOfCompetition" DOUBLE PRECISION,
    "collegeFreshmanYards" DOUBLE PRECISION,
    "collegeTargetShare" DOUBLE PRECISION,
    "collegeReceiverRating" TEXT,
    "collegeYpr" DOUBLE PRECISION,
    "collegeTeammateScore" DOUBLE PRECISION,
    "bestCollegeSeasonYardageShare" DOUBLE PRECISION,
    "draftPick" DOUBLE PRECISION,
    "draftYear" INTEGER,
    "currentAdp" DOUBLE PRECISION,
    "currentAdpTrend" DOUBLE PRECISION,
    "lifetimeValue" DOUBLE PRECISION,
    "bestComparablePlayers" TEXT,
    "totalFantasyPoints" DOUBLE PRECISION,
    "fantasyPointsPerGame" DOUBLE PRECISION,
    "expectedFantasyPoints" DOUBLE PRECISION,
    "expectedFantasyPointsPerGame" DOUBLE PRECISION,
    "weeklyVolatility" DOUBLE PRECISION,
    "rawData" JSONB,
    "source" TEXT NOT NULL DEFAULT 'csv_import',
    "dataVersion" TEXT NOT NULL DEFAULT 'v1',
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerAnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "app_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "username" TEXT NOT NULL,
    "passwordHash" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "detectedStateCode" TEXT,
    "isStateRestricted" BOOLEAN NOT NULL DEFAULT false,
    "stateRestrictionLevel" TEXT,
    "legacyUserId" TEXT,
    "activeLeagueId" TEXT,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "growth_attributions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" VARCHAR(32) NOT NULL,
    "sourceId" VARCHAR(128),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "growth_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "invite_links" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(24) NOT NULL,
    "token" VARCHAR(32) NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "targetId" VARCHAR(128),
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER NOT NULL DEFAULT 0,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invite_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "invite_link_events" (
    "id" TEXT NOT NULL,
    "inviteLinkId" TEXT NOT NULL,
    "eventType" VARCHAR(32) NOT NULL,
    "channel" VARCHAR(24),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_link_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "creator_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    "displayName" VARCHAR(128),
    "creatorType" VARCHAR(32),
    "bio" TEXT,
    "communitySummary" TEXT,
    "avatarUrl" VARCHAR(512),
    "bannerUrl" VARCHAR(512),
    "websiteUrl" VARCHAR(512),
    "socialHandles" JSONB,
    "verifiedAt" TIMESTAMP(3),
    "verificationBadge" VARCHAR(32),
    "visibility" VARCHAR(16) NOT NULL DEFAULT 'public',
    "communityVisibility" VARCHAR(16) NOT NULL DEFAULT 'public',
    "branding" JSONB,
    "featuredRank" INTEGER,
    "featuredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "creator_leagues" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "leagueId" VARCHAR(64),
    "bracketLeagueId" VARCHAR(64),
    "name" VARCHAR(256) NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "sport" VARCHAR(12) NOT NULL,
    "inviteCode" VARCHAR(32) NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "maxMembers" INTEGER NOT NULL DEFAULT 100,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "joinDeadline" TIMESTAMP(3),
    "coverImageUrl" VARCHAR(512),
    "communitySummary" TEXT,
    "latestRecapTitle" VARCHAR(160),
    "latestRecapSummary" TEXT,
    "latestCommentary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "creator_invites" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "creatorLeagueId" TEXT,
    "code" VARCHAR(32) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER NOT NULL DEFAULT 0,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "creator_league_members" (
    "id" TEXT NOT NULL,
    "creatorLeagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedViaCode" VARCHAR(32),

    CONSTRAINT "creator_league_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "creator_analytics_events" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "eventType" VARCHAR(32) NOT NULL,
    "leagueId" VARCHAR(64),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "referral_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "successfulReferralCount" INTEGER NOT NULL DEFAULT 0,
    "lastSharedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT,
    "referralCodeId" TEXT,
    "kind" VARCHAR(16) NOT NULL DEFAULT 'user',
    "status" VARCHAR(24) NOT NULL DEFAULT 'clicked',
    "onboardingStep" VARCHAR(48),
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signupCompletedAt" TIMESTAMP(3),
    "onboardingStartedAt" TIMESTAMP(3),
    "onboardingCompletedAt" TIMESTAMP(3),
    "rewardGrantedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "referral_events" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT,
    "referralId" TEXT,
    "codeId" TEXT,
    "type" VARCHAR(32) NOT NULL,
    "channel" VARCHAR(24),
    "onboardingStep" VARCHAR(48),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "referral_reward_rules" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "type" VARCHAR(48) NOT NULL,
    "label" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "triggerType" VARCHAR(32) NOT NULL,
    "audience" VARCHAR(16) NOT NULL DEFAULT 'all',
    "rewardKind" VARCHAR(24) NOT NULL DEFAULT 'xp',
    "value" INTEGER NOT NULL DEFAULT 0,
    "badgeType" VARCHAR(64),
    "badgeName" VARCHAR(128),
    "badgeDescription" TEXT,
    "badgeTier" VARCHAR(16),
    "maxAwardsPerUser" INTEGER NOT NULL DEFAULT 0,
    "minSuccessfulReferrals" INTEGER NOT NULL DEFAULT 0,
    "isClaimable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_reward_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "referral_rewards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "referralId" TEXT,
    "rewardRuleId" TEXT,
    "type" VARCHAR(48) NOT NULL,
    "rewardKind" VARCHAR(24) NOT NULL DEFAULT 'xp',
    "label" VARCHAR(128),
    "value" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "metadata" JSONB,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),

    CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "auth_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "auth_sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "auth_verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BracketTournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "sport" TEXT NOT NULL,
    "lockAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BracketTournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BracketNode" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "region" TEXT,
    "slot" TEXT NOT NULL,
    "seedHome" INTEGER,
    "seedAway" INTEGER,
    "homeTeamName" TEXT,
    "awayTeamName" TEXT,
    "sportsGameId" TEXT,
    "nextNodeId" TEXT,
    "nextNodeSide" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BracketNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BracketLeague" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "maxManagers" INTEGER NOT NULL DEFAULT 100,
    "deadline" TIMESTAMP(3),
    "inviteExpiresAt" TIMESTAMP(3),
    "scoringRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BracketLeague_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BracketLeagueMember" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BracketLeagueMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BracketEntry" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "insuredNodeId" TEXT,
    "tiebreakerPoints" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "scoredAt" TIMESTAMP(3),
    "invalidatedAt" TIMESTAMP(3),
    "integrityHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BracketEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BracketEntrySnapshot" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "bracketJson" JSONB NOT NULL,
    "bracketHash" TEXT NOT NULL,
    "createdBySystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BracketEntrySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bracket_pick_popularity" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "leagueId" TEXT,
    "nodeId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "teamName" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "pickCount" INTEGER NOT NULL,
    "pickPct" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bracket_pick_popularity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bracket_simulation_snapshot" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "simulations" INTEGER NOT NULL,
    "winLeagueProbability" DOUBLE PRECISION NOT NULL,
    "top5Probability" DOUBLE PRECISION NOT NULL,
    "expectedRank" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bracket_simulation_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bracket_leaderboards" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "leagueId" TEXT,
    "entryId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "previousRank" INTEGER,
    "tieGroup" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bracket_leaderboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bracket_health_snapshots" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "healthScore" INTEGER NOT NULL,
    "statusLabel" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bracket_health_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BracketPick" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "pickedTeamName" TEXT,
    "lockedAt" TIMESTAMP(3),
    "points" INTEGER NOT NULL DEFAULT 0,
    "isCorrect" BOOLEAN,

    CONSTRAINT "BracketPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bracket_league_messages" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "replyToId" TEXT,
    "imageUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bracket_league_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bracket_message_reactions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bracket_message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BracketPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "stripePaymentIntent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BracketPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bracket_feed_events" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "leagueId" TEXT,
    "eventType" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "detail" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bracket_feed_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bracket_risk_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "riskTolerance" TEXT NOT NULL DEFAULT 'balanced',
    "poolCount" INTEGER NOT NULL DEFAULT 1,
    "poolSizeEstimate" INTEGER NOT NULL DEFAULT 20,
    "goal" TEXT NOT NULL DEFAULT 'mincash',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bracket_risk_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "simulation_results" (
    "id" TEXT NOT NULL,
    "bracketId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "runs" INTEGER NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "scoringMode" TEXT NOT NULL DEFAULT 'EDGE',
    "resultJson" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulation_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bracket_challenges" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "challengerEntryId" TEXT NOT NULL,
    "challengedEntryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bracket_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "activity_events" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT,
    "entryId" TEXT,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "reaction_events" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT,
    "entryId" TEXT,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reaction_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_rivalries" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "totalMeetings" INTEGER NOT NULL DEFAULT 0,
    "winsA" INTEGER NOT NULL DEFAULT 0,
    "winsB" INTEGER NOT NULL DEFAULT 0,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_rivalries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "rivalry_records" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "managerAId" VARCHAR(128) NOT NULL,
    "managerBId" VARCHAR(128) NOT NULL,
    "rivalryScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rivalryTier" VARCHAR(32) NOT NULL,
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rivalry_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "rivalry_events" (
    "id" TEXT NOT NULL,
    "rivalryId" TEXT NOT NULL,
    "eventType" VARCHAR(48) NOT NULL,
    "season" INTEGER,
    "matchupId" VARCHAR(64),
    "tradeId" VARCHAR(64),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rivalry_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "manager_psych_profiles" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "profileLabels" JSONB NOT NULL DEFAULT '[]',
    "aggressionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tradeFrequencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waiverFocusScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskToleranceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_psych_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "profile_evidence_records" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "evidenceType" VARCHAR(48) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourceReference" VARCHAR(256),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileId" VARCHAR(64),

    CONSTRAINT "profile_evidence_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "drama_events" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "season" INTEGER,
    "dramaType" VARCHAR(48) NOT NULL,
    "headline" VARCHAR(256) NOT NULL,
    "summary" TEXT,
    "relatedManagerIds" JSONB NOT NULL DEFAULT '[]',
    "relatedTeamIds" JSONB NOT NULL DEFAULT '[]',
    "relatedMatchupId" VARCHAR(64),
    "dramaScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drama_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "drama_timeline_records" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "season" INTEGER,
    "eventIds" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drama_timeline_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "manager_reputation_records" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "season" INTEGER NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reliabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tradeFairnessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sportsmanshipScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionerTrustScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "toxicityRiskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "participationQualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responsivenessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tier" VARCHAR(32) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_reputation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "reputation_evidence_records" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "season" INTEGER NOT NULL DEFAULT 0,
    "evidenceType" VARCHAR(64) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourceReference" VARCHAR(256),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_evidence_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "reputation_config_records" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "season" INTEGER NOT NULL DEFAULT 0,
    "tierThresholds" JSONB,
    "scoreWeights" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reputation_config_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "manager_franchise_profiles" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "totalCareerSeasons" INTEGER NOT NULL DEFAULT 0,
    "totalLeaguesPlayed" INTEGER NOT NULL DEFAULT 0,
    "championshipCount" INTEGER NOT NULL DEFAULT 0,
    "playoffAppearances" INTEGER NOT NULL DEFAULT 0,
    "careerWinPercentage" DECIMAL(6,4) NOT NULL,
    "gmPrestigeScore" DECIMAL(10,4) NOT NULL,
    "franchiseValue" DECIMAL(12,4) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_franchise_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "gm_progression_events" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "valueChange" DECIMAL(12,4) NOT NULL,
    "sourceReference" VARCHAR(256),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gm_progression_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "manager_xp_profiles" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "currentTier" VARCHAR(32) NOT NULL,
    "xpToNextTier" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_xp_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "xp_events" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "xpValue" INTEGER NOT NULL DEFAULT 0,
    "sport" VARCHAR(16) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "award_records" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "season" VARCHAR(16) NOT NULL,
    "awardType" VARCHAR(64) NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "score" DECIMAL(12,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "award_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "record_book_entries" (
    "id" TEXT NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "recordType" VARCHAR(64) NOT NULL,
    "holderId" VARCHAR(128) NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "season" VARCHAR(16) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_book_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "manager_wallets" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "currencyBalance" INTEGER NOT NULL DEFAULT 0,
    "earnedLifetime" INTEGER NOT NULL DEFAULT 0,
    "spentLifetime" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "marketplace_items" (
    "id" TEXT NOT NULL,
    "itemType" VARCHAR(64) NOT NULL,
    "itemName" VARCHAR(128) NOT NULL,
    "description" VARCHAR(512),
    "price" INTEGER NOT NULL DEFAULT 0,
    "sportRestriction" VARCHAR(16),
    "cosmeticCategory" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "purchase_records" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "itemId" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "media_articles" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "headline" VARCHAR(256) NOT NULL,
    "body" TEXT NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "blog_articles" (
    "articleId" TEXT NOT NULL,
    "title" VARCHAR(512) NOT NULL,
    "slug" VARCHAR(512) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "excerpt" VARCHAR(1024),
    "body" TEXT NOT NULL,
    "seoTitle" VARCHAR(512),
    "seoDescription" VARCHAR(512),
    "tags" JSONB NOT NULL DEFAULT '[]',
    "publishStatus" VARCHAR(24) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_articles_pkey" PRIMARY KEY ("articleId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "blog_drafts" (
    "draftId" TEXT NOT NULL,
    "articleId" VARCHAR(64) NOT NULL,
    "title" VARCHAR(512) NOT NULL,
    "slug" VARCHAR(512) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "excerpt" VARCHAR(1024),
    "body" TEXT NOT NULL,
    "seoTitle" VARCHAR(512),
    "seoDescription" VARCHAR(512),
    "tags" JSONB NOT NULL DEFAULT '[]',
    "draftStatus" VARCHAR(24) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_drafts_pkey" PRIMARY KEY ("draftId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "blog_publish_logs" (
    "publishId" TEXT NOT NULL,
    "articleId" VARCHAR(64) NOT NULL,
    "actionType" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_publish_logs_pkey" PRIMARY KEY ("publishId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "broadcast_sessions" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(128),

    CONSTRAINT "broadcast_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "commentary_entries" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "eventType" VARCHAR(32) NOT NULL,
    "headline" VARCHAR(256) NOT NULL,
    "body" TEXT NOT NULL,
    "contextSnap" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commentary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_profiles" (
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "phone" TEXT,
    "phoneVerifiedAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "ageConfirmedAt" TIMESTAMP(3),
    "verificationMethod" "VerificationMethod",
    "sleeperUsername" TEXT,
    "sleeperUserId" TEXT,
    "sleeperLinkedAt" TIMESTAMP(3),
    "sleeperVerifiedAt" TIMESTAMP(3),
    "profileComplete" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT,
    "preferredLanguage" TEXT,
    "themePreference" TEXT,
    "sessionIdleTimeoutMinutes" INTEGER,
    "avatarPreset" TEXT,
    "bio" TEXT,
    "preferredSports" JSONB,
    "notificationPreferences" JSONB,
    "rankingsContext" JSONB,
    "legacy_career_tier" INTEGER,
    "legacy_career_tier_name" TEXT,
    "legacy_career_level" INTEGER,
    "legacy_career_xp" BIGINT,
    "legacy_rank_updated_at" TIMESTAMP(3),
    "rank_tier" TEXT,
    "xp_total" BIGINT,
    "xp_level" INTEGER,
    "career_wins" INTEGER,
    "career_losses" INTEGER,
    "career_championships" INTEGER,
    "career_playoff_appearances" INTEGER,
    "career_seasons_played" INTEGER,
    "career_leagues_played" INTEGER,
    "rank_calculated_at" TIMESTAMP(3),
    "league_import_detail_pending" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" TEXT,
    "onboardingCompletedAt" TIMESTAMP(3),
    "retentionNudgeDismissedAt" JSONB,
    "discordUserId" TEXT,
    "discordUsername" TEXT,
    "discordEmail" TEXT,
    "discordAvatar" TEXT,
    "discordAccessToken" TEXT,
    "discordRefreshToken" TEXT,
    "discordConnectedAt" TIMESTAMP(3),
    "discordGuildId" TEXT,
    "afCommissionerSub" BOOLEAN NOT NULL DEFAULT false,
    "afProSub" BOOLEAN NOT NULL DEFAULT false,
    "afWarRoomSub" BOOLEAN NOT NULL DEFAULT false,
    "autoCoachGlobalEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "discord_guild_links" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "guildName" TEXT,
    "linkedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discord_guild_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "discord_league_channels" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT,
    "webhookId" TEXT,
    "webhookToken" TEXT,
    "lastSyncedMessageId" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncOutbound" BOOLEAN NOT NULL DEFAULT true,
    "syncInbound" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discord_league_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "discord_message_links" (
    "id" TEXT NOT NULL,
    "leagueMessageId" TEXT,
    "discordMessageId" TEXT,
    "direction" VARCHAR(16) NOT NULL,
    "guildId" TEXT,
    "channelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discord_message_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "pending_signups" (
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_signups_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email_verify_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verify_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "leagues" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platformLeagueId" TEXT NOT NULL,
    "name" TEXT,
    "sport" "LeagueSport" NOT NULL DEFAULT 'NFL',
    "leagueVariant" VARCHAR(32),
    "season" INTEGER NOT NULL DEFAULT 2024,
    "leagueSize" INTEGER,
    "scoring" TEXT,
    "isDynasty" BOOLEAN NOT NULL DEFAULT false,
    "rosterSize" INTEGER,
    "starters" JSONB,
    "status" TEXT,
    "avatarUrl" TEXT,
    "settings" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT,
    "syncError" TEXT,
    "importBatchId" VARCHAR(64),
    "importedAt" TIMESTAMP(3),
    "isCommissioner" BOOLEAN NOT NULL DEFAULT false,
    "import_wins" INTEGER,
    "import_losses" INTEGER,
    "import_ties" INTEGER,
    "import_points_for" DOUBLE PRECISION,
    "import_points_against" DOUBLE PRECISION,
    "import_made_playoffs" BOOLEAN,
    "import_won_championship" BOOLEAN,
    "import_final_standing" INTEGER,
    "logoUrl" TEXT,
    "timezone" TEXT DEFAULT 'America/New_York',
    "waiverType" TEXT DEFAULT 'rolling',
    "waiverBudget" INTEGER DEFAULT 100,
    "waiverMinBid" INTEGER DEFAULT 0,
    "waiverClearAfterGames" BOOLEAN NOT NULL DEFAULT true,
    "waiverHours" INTEGER DEFAULT 24,
    "customDailyWaivers" BOOLEAN NOT NULL DEFAULT false,
    "waiverProcessTime" TEXT DEFAULT '02:00',
    "waiverSchedule" JSONB,
    "tradeReviewHours" INTEGER DEFAULT 48,
    "tradeDeadlineWeek" INTEGER,
    "draftPickTrading" BOOLEAN NOT NULL DEFAULT false,
    "playoffStartWeek" INTEGER DEFAULT 14,
    "playoffTeams" INTEGER DEFAULT 4,
    "playoffWeeksPerRound" INTEGER DEFAULT 1,
    "playoffSeedingRule" TEXT DEFAULT 'default',
    "playoffLowerBracket" TEXT DEFAULT 'consolation',
    "irSlots" INTEGER DEFAULT 0,
    "irAllowCovid" BOOLEAN NOT NULL DEFAULT false,
    "irAllowOut" BOOLEAN NOT NULL DEFAULT true,
    "irAllowSuspended" BOOLEAN NOT NULL DEFAULT false,
    "irAllowNA" BOOLEAN NOT NULL DEFAULT false,
    "irAllowDNR" BOOLEAN NOT NULL DEFAULT false,
    "irAllowDoubtful" BOOLEAN NOT NULL DEFAULT false,
    "leagueType" TEXT DEFAULT 'redraft',
    "devyYear" TEXT,
    "medianGame" BOOLEAN NOT NULL DEFAULT false,
    "allowPreDraftMoves" BOOLEAN NOT NULL DEFAULT true,
    "preventBenchDrops" BOOLEAN NOT NULL DEFAULT false,
    "lockAllMoves" BOOLEAN NOT NULL DEFAULT false,
    "supplementalDraftRounds" INTEGER DEFAULT 0,
    "taxiSlots" INTEGER DEFAULT 0,
    "taxiAllowNonRookies" BOOLEAN NOT NULL DEFAULT false,
    "taxiYearsLimit" INTEGER DEFAULT 2,
    "taxiDeadlineWeek" INTEGER DEFAULT 0,
    "overrideInviteCapacity" BOOLEAN NOT NULL DEFAULT false,
    "disableInviteLinks" BOOLEAN NOT NULL DEFAULT false,
    "aiChimmyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiWaiverSuggestions" BOOLEAN NOT NULL DEFAULT false,
    "aiTradeAnalysis" BOOLEAN NOT NULL DEFAULT false,
    "aiLineupHelp" BOOLEAN NOT NULL DEFAULT false,
    "aiDraftRecs" BOOLEAN NOT NULL DEFAULT false,
    "aiRecaps" BOOLEAN NOT NULL DEFAULT false,
    "leagueAiCommissionerAlerts" BOOLEAN NOT NULL DEFAULT false,
    "aiModeration" BOOLEAN NOT NULL DEFAULT false,
    "aiPowerRankings" BOOLEAN NOT NULL DEFAULT false,
    "keeperCount" INTEGER DEFAULT 3,
    "keeperCostSystem" TEXT DEFAULT 'round_based',
    "keeperMaxYears" INTEGER DEFAULT 3,
    "keeperWaiverAllowed" BOOLEAN DEFAULT true,
    "keeperEligibilityRule" TEXT DEFAULT 'any',
    "keeperMinRoundsHeld" INTEGER DEFAULT 0,
    "keeperRoundPenalty" INTEGER DEFAULT 1,
    "keeperInflationRate" INTEGER DEFAULT 1,
    "keeperAuctionPctIncrease" DOUBLE PRECISION DEFAULT 0.2,
    "keeperSelectionDeadline" TIMESTAMP(3),
    "keeperPhaseActive" BOOLEAN DEFAULT false,
    "dynastySeasonPhase" TEXT DEFAULT 'regular',
    "keeperConflictRule" TEXT DEFAULT 'player_chooses',
    "keeperMissedDeadlineRule" TEXT DEFAULT 'auto_no_keepers',
    "bestBallVariant" TEXT DEFAULT 'standard',
    "bestBallMode" BOOLEAN DEFAULT false,
    "bbWaiversEnabled" BOOLEAN DEFAULT false,
    "bbTradesEnabled" BOOLEAN DEFAULT false,
    "bbFaEnabled" BOOLEAN DEFAULT false,
    "bbIrEnabled" BOOLEAN DEFAULT false,
    "bbTaxiEnabled" BOOLEAN DEFAULT false,
    "bbScoringPeriod" TEXT DEFAULT 'weekly',
    "bbMatchupFormat" TEXT DEFAULT 'h2h',
    "bbTiebreaker" TEXT DEFAULT 'points_for',
    "bbOptimizerTiming" TEXT DEFAULT 'period_end',
    "bbContestId" TEXT,
    "guillotineMode" BOOLEAN DEFAULT false,
    "guillotineEndgame" TEXT DEFAULT 'last_team_standing',
    "guillotineEndgameThreshold" INTEGER DEFAULT 1,
    "guillotineEliminationsPerPeriod" INTEGER DEFAULT 1,
    "guillotineProtectedWeek1" BOOLEAN DEFAULT false,
    "guillotineAcceleratedWeeks" TEXT DEFAULT '[]',
    "guillotineTiebreaker" TEXT DEFAULT 'lowest_bench_points',
    "guillotineSamePeriodPickups" BOOLEAN DEFAULT false,
    "guillotineWaiverDelay" INTEGER DEFAULT 0,
    "guillotineRosterExpansion" JSONB DEFAULT '[]',
    "guillotineFinalStageScoring" TEXT DEFAULT 'cumulative',
    "survivorMode" BOOLEAN DEFAULT false,
    "survivorPhase" TEXT DEFAULT 'pre_draft',
    "survivorPlayerCount" INTEGER DEFAULT 20,
    "survivorTribeCount" INTEGER DEFAULT 4,
    "survivorTribeSize" INTEGER DEFAULT 5,
    "survivorTribeNaming" TEXT DEFAULT 'auto',
    "survivorMergeWeek" INTEGER DEFAULT 7,
    "survivorMergeTrigger" TEXT DEFAULT 'week',
    "survivorMergeAtCount" INTEGER DEFAULT 10,
    "survivorJuryStart" TEXT DEFAULT 'post_merge_vote_1',
    "survivorFinal3" BOOLEAN DEFAULT true,
    "survivorSwapWeek" INTEGER,
    "survivorSwapTrigger" TEXT DEFAULT 'manual',
    "survivorIdolsEnabled" BOOLEAN DEFAULT true,
    "survivorIdolCount" INTEGER DEFAULT 9,
    "survivorIdolsTradable" BOOLEAN DEFAULT false,
    "survivorIdolsExpireAtMerge" BOOLEAN DEFAULT true,
    "survivorIdolConvertRule" TEXT DEFAULT 'faab',
    "survivorExileEnabled" BOOLEAN DEFAULT true,
    "survivorTokenEnabled" BOOLEAN DEFAULT true,
    "survivorBossResetEnabled" BOOLEAN DEFAULT true,
    "survivorExileReturnWeek" INTEGER,
    "survivorExileReturnTrigger" TEXT DEFAULT 'manual',
    "survivorSelfVoteAllowed" BOOLEAN DEFAULT false,
    "survivorTieRule" TEXT DEFAULT 'revote_then_rocks',
    "survivorRocksEnabled" BOOLEAN DEFAULT true,
    "survivorRevealMode" TEXT DEFAULT 'dramatic_sequential',
    "survivorChallengeMode" TEXT DEFAULT 'auto',
    "survivorDailyMessages" BOOLEAN DEFAULT false,
    "survivorWeeklyMessages" BOOLEAN DEFAULT true,
    "survivorChatPermissions" TEXT DEFAULT 'strict',
    "survivorRebalanceTrigger" INTEGER DEFAULT 3,
    "survivorTokenCap" INTEGER,
    "survivorExileHarshTokenLoss" BOOLEAN DEFAULT false,
    "autoCoachEnabled" BOOLEAN NOT NULL DEFAULT true,
    "legacyLeagueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "integrity_flags" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "flagType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "affectedRosterIds" TEXT[],
    "affectedTeamNames" TEXT[],
    "summary" TEXT NOT NULL,
    "evidenceJson" JSONB NOT NULL,
    "aiConfidence" DOUBLE PRECISION NOT NULL,
    "tradeTransactionId" TEXT,
    "commissionerNote" TEXT,
    "commissionerUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrity_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "league_integrity_settings" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "collusionMonitoringEnabled" BOOLEAN NOT NULL DEFAULT true,
    "collusionSensitivity" TEXT NOT NULL DEFAULT 'medium',
    "tankingMonitorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tankingSensitivity" TEXT NOT NULL DEFAULT 'medium',
    "tankingStartWeek" INTEGER,
    "tankingIllegalLineupCheck" BOOLEAN NOT NULL DEFAULT true,
    "tankingBenchPatternCheck" BOOLEAN NOT NULL DEFAULT true,
    "tankingWaiverPatternCheck" BOOLEAN NOT NULL DEFAULT false,
    "lastCollusionScanAt" TIMESTAMP(3),
    "lastTankingScanAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_integrity_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "auto_coach_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "blockedByCommissioner" BOOLEAN NOT NULL DEFAULT false,
    "lastRunAt" TIMESTAMP(3),
    "lastSwapAt" TIMESTAMP(3),
    "totalSwapsMade" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_coach_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "auto_coach_swap_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "slotPosition" TEXT NOT NULL,
    "playerOutId" TEXT NOT NULL,
    "playerOutName" TEXT NOT NULL,
    "playerOutStatus" TEXT NOT NULL,
    "playerInId" TEXT NOT NULL,
    "playerInName" TEXT NOT NULL,
    "playerInPosition" TEXT NOT NULL,
    "statusSource" TEXT NOT NULL,
    "statusDetectedAt" TIMESTAMP(3) NOT NULL,
    "swapMadeAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gameStartsAt" TIMESTAMP(3),
    "wasPreGame" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_coach_swap_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "player_status_events" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "teamAbbrev" TEXT,
    "newStatus" TEXT NOT NULL,
    "previousStatus" TEXT,
    "statusReason" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceRawText" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "gameDate" TIMESTAMP(3),
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autoCoachTriggered" BOOLEAN NOT NULL DEFAULT false,
    "autoCoachTriggeredAt" TIMESTAMP(3),

    CONSTRAINT "player_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "league_settings" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "draftDateUtc" TIMESTAMP(3),
    "timezone" TEXT DEFAULT 'America/New_York',
    "autostart" BOOLEAN NOT NULL DEFAULT false,
    "slowDraftPause" BOOLEAN NOT NULL DEFAULT false,
    "slowPauseFrom" TEXT,
    "slowPauseUntil" TEXT,
    "cpuAutoPick" BOOLEAN NOT NULL DEFAULT true,
    "aiAutoPick" BOOLEAN NOT NULL DEFAULT false,
    "draftType" TEXT NOT NULL DEFAULT 'snake',
    "pickTimerPreset" TEXT NOT NULL DEFAULT '120s',
    "pickTimerCustomValue" INTEGER,
    "rounds" INTEGER NOT NULL DEFAULT 15,
    "draftOrderMethod" TEXT NOT NULL DEFAULT 'manual',
    "randomizeCount" INTEGER,
    "draftOrderSlots" JSONB,
    "draftOrderLocked" BOOLEAN NOT NULL DEFAULT false,
    "keeperCount" INTEGER NOT NULL DEFAULT 0,
    "keeperRoundCost" BOOLEAN NOT NULL DEFAULT false,
    "keeperSlots" JSONB,
    "dynastyCarryover" BOOLEAN NOT NULL DEFAULT false,
    "playerPool" TEXT NOT NULL DEFAULT 'all',
    "alphabeticalSort" BOOLEAN NOT NULL DEFAULT false,
    "aiQueueSuggestions" BOOLEAN NOT NULL DEFAULT true,
    "aiBestAvailable" BOOLEAN NOT NULL DEFAULT true,
    "aiRosterGuidance" BOOLEAN NOT NULL DEFAULT true,
    "aiScarcityAlerts" BOOLEAN NOT NULL DEFAULT true,
    "aiDraftGrade" BOOLEAN NOT NULL DEFAULT true,
    "aiSleeperAlerts" BOOLEAN NOT NULL DEFAULT true,
    "aiByeAwareness" BOOLEAN NOT NULL DEFAULT true,
    "aiStackSuggestions" BOOLEAN NOT NULL DEFAULT false,
    "aiRiskUpsideNotes" BOOLEAN NOT NULL DEFAULT true,
    "aiScope" TEXT NOT NULL DEFAULT 'everyone',
    "randomizeHistory" JSONB,
    "resetHistory" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "league_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "league_seasons" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "platformLeagueId" TEXT NOT NULL,
    "championTeamId" TEXT,
    "championName" TEXT,
    "championAvatar" TEXT,
    "runnerUpName" TEXT,
    "regularSeasonWinnerName" TEXT,
    "teamRecords" JSONB,
    "teamCount" INTEGER,
    "scoringFormat" TEXT,
    "isDynasty" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "league_storylines" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" INTEGER,
    "week" INTEGER,
    "storyType" VARCHAR(32) NOT NULL DEFAULT 'weekly_storyline',
    "title" VARCHAR(160) NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "source" VARCHAR(24) NOT NULL DEFAULT 'ai',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_storylines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "league_matchup_previews" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" INTEGER,
    "week" INTEGER NOT NULL,
    "rosterAId" VARCHAR(64),
    "rosterBId" VARCHAR(64),
    "headline" VARCHAR(160) NOT NULL,
    "summary" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_matchup_previews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "draft_recaps" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "draftSessionId" TEXT,
    "title" VARCHAR(160) NOT NULL,
    "summary" TEXT NOT NULL,
    "sections" JSONB,
    "metadata" JSONB,
    "generatedBy" VARCHAR(24) NOT NULL DEFAULT 'ai',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_recaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "keeper_declarations" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "season" INTEGER,
    "playerId" VARCHAR(64) NOT NULL,
    "playerName" VARCHAR(160),
    "position" VARCHAR(24),
    "roundCost" INTEGER,
    "costType" VARCHAR(32) NOT NULL DEFAULT 'previous_round',
    "salaryValue" INTEGER,
    "status" VARCHAR(24) NOT NULL DEFAULT 'declared',
    "deadlineAt" TIMESTAMP(3),
    "commissionerNotes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keeper_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "scoring_settings_snapshots" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" INTEGER,
    "week" INTEGER,
    "formatKey" VARCHAR(64),
    "scoringMode" VARCHAR(24) NOT NULL DEFAULT 'points',
    "scoringFormat" VARCHAR(64),
    "templateId" VARCHAR(128),
    "modifiers" TEXT[],
    "effectiveRules" JSONB NOT NULL,
    "overrides" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scoring_settings_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "league_intro_views" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "league_intro_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "league_templates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tournaments" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "sport" VARCHAR(8) NOT NULL,
    "season" INTEGER NOT NULL DEFAULT 0,
    "variant" VARCHAR(32) NOT NULL DEFAULT 'black_vs_gold',
    "creatorId" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "hubSettings" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(24) NOT NULL DEFAULT 'setup',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "championUserId" VARCHAR(64),
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tournament_conferences" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "theme" VARCHAR(24) NOT NULL DEFAULT 'black',
    "themePayload" JSONB,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_conferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tournament_leagues" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "roundIndex" INTEGER NOT NULL DEFAULT 0,
    "phase" VARCHAR(24) NOT NULL DEFAULT 'qualification',
    "orderInConference" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tournament_rounds" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundIndex" INTEGER NOT NULL,
    "phase" VARCHAR(24) NOT NULL,
    "name" VARCHAR(64),
    "startWeek" INTEGER DEFAULT 0,
    "endWeek" INTEGER DEFAULT 0,
    "status" VARCHAR(24) NOT NULL DEFAULT 'pending',
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tournament_announcements" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "authorId" TEXT,
    "title" VARCHAR(200),
    "body" TEXT NOT NULL,
    "type" VARCHAR(32) NOT NULL DEFAULT 'general',
    "metadata" JSONB,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tournament_audit_logs" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" VARCHAR(48) NOT NULL,
    "targetType" VARCHAR(24),
    "targetId" VARCHAR(128),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tournament_participants" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "qualificationLeagueId" TEXT,
    "qualificationRosterId" TEXT,
    "qualificationRankInConference" INTEGER,
    "qualificationWins" INTEGER NOT NULL DEFAULT 0,
    "qualificationLosses" INTEGER NOT NULL DEFAULT 0,
    "qualificationPointsFor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qualificationPointsAgainst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentLeagueId" TEXT,
    "currentRosterId" TEXT,
    "advancedAtRoundIndex" INTEGER NOT NULL DEFAULT 0,
    "eliminatedAtRoundIndex" INTEGER,
    "status" VARCHAR(24) NOT NULL DEFAULT 'active',
    "bubbleAdvanced" BOOLEAN NOT NULL DEFAULT false,
    "bracketLabel" VARCHAR(32),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tournament_shells" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'setup',
    "maxParticipants" INTEGER NOT NULL DEFAULT 120,
    "currentParticipantCount" INTEGER NOT NULL DEFAULT 0,
    "conferenceCount" INTEGER NOT NULL DEFAULT 2,
    "leaguesPerConference" INTEGER NOT NULL DEFAULT 6,
    "teamsPerLeague" INTEGER NOT NULL DEFAULT 10,
    "namingMode" TEXT NOT NULL DEFAULT 'hybrid',
    "currentRoundNumber" INTEGER NOT NULL DEFAULT 0,
    "totalRounds" INTEGER NOT NULL DEFAULT 4,
    "openingWeekStart" INTEGER NOT NULL,
    "bubbleWeek" INTEGER,
    "redraftWeek" INTEGER,
    "eliteRedraftWeek" INTEGER,
    "championshipWeek" INTEGER,
    "scoringSystem" TEXT NOT NULL DEFAULT 'ppr',
    "draftType" TEXT NOT NULL DEFAULT 'snake',
    "waiverType" TEXT NOT NULL DEFAULT 'faab',
    "advancersPerLeague" INTEGER NOT NULL DEFAULT 1,
    "wildcardCount" INTEGER NOT NULL DEFAULT 0,
    "bubbleSize" INTEGER NOT NULL DEFAULT 8,
    "bubbleEnabled" BOOLEAN NOT NULL DEFAULT true,
    "bubbleScoringMode" TEXT NOT NULL DEFAULT 'cumulative_points',
    "openingRosterSize" INTEGER NOT NULL DEFAULT 15,
    "tournamentRosterSize" INTEGER NOT NULL DEFAULT 10,
    "eliteRosterSize" INTEGER NOT NULL DEFAULT 8,
    "irEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tradeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "faabResetOnRedraft" BOOLEAN NOT NULL DEFAULT true,
    "draftClockSeconds" INTEGER NOT NULL DEFAULT 90,
    "asyncDraft" BOOLEAN NOT NULL DEFAULT false,
    "simultaneousDrafts" BOOLEAN NOT NULL DEFAULT true,
    "tiebreakerMode" TEXT NOT NULL DEFAULT 'points_for',
    "standingsVisibility" TEXT NOT NULL DEFAULT 'conference',
    "commissionerId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_shells_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tournament_shell_conferences" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "theme" TEXT,
    "colorHex" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "conferenceNumber" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "standingsCache" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_shell_conferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tournament_shell_rounds" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "roundType" TEXT NOT NULL,
    "roundLabel" TEXT NOT NULL,
    "weekStart" INTEGER NOT NULL,
    "weekEnd" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "leagueNamingTheme" TEXT,
    "rosterSizeOverride" INTEGER,
    "irEnabledOverride" BOOLEAN,
    "tradeEnabledOverride" BOOLEAN,
    "waiversEnabledOverride" BOOLEAN,
    "draftScheduledAt" TIMESTAMP(3),
    "roundStartedAt" TIMESTAMP(3),
    "roundCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_shell_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tournament_shell_leagues" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "conferenceId" TEXT,
    "roundId" TEXT NOT NULL,
    "leagueId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "colorHex" TEXT,
    "leagueNumber" INTEGER NOT NULL,
    "teamSlots" INTEGER NOT NULL,
    "currentTeamCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'forming',
    "draftScheduledAt" TIMESTAMP(3),
    "draftCompletedAt" TIMESTAMP(3),
    "draftSessionId" TEXT,
    "advancersCount" INTEGER NOT NULL DEFAULT 1,
    "advancementGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_shell_leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tournament_shell_participants" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentRoundNumber" INTEGER NOT NULL DEFAULT 1,
    "furthestRoundReached" INTEGER NOT NULL DEFAULT 1,
    "totalRoundsPlayed" INTEGER NOT NULL DEFAULT 0,
    "currentConferenceId" TEXT,
    "originalConferenceId" TEXT,
    "currentLeagueId" TEXT,
    "careerWins" INTEGER NOT NULL DEFAULT 0,
    "careerLosses" INTEGER NOT NULL DEFAULT 0,
    "careerPointsFor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "careerPointsAgainst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advancementHistory" JSONB,
    "roundRosterIds" JSONB,
    "roundFaabBalances" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_shell_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tournament_shell_league_participants" (
    "id" TEXT NOT NULL,
    "tournamentLeagueId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsAgainst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "streak" TEXT,
    "leagueRank" INTEGER,
    "conferenceRank" INTEGER,
    "advancementStatus" TEXT NOT NULL DEFAULT 'competing',
    "redraftRosterId" TEXT,
    "draftSlot" INTEGER,
    "faabBalance" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "tournament_shell_league_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tournament_shell_advancement_groups" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "conferenceId" TEXT,
    "fromRoundId" TEXT NOT NULL,
    "toRoundId" TEXT,
    "groupType" TEXT NOT NULL,
    "participantIds" TEXT[],
    "maxSize" INTEGER NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isBubbleGroup" BOOLEAN NOT NULL DEFAULT false,
    "bubbleScoringSnapshot" JSONB,
    "bubbleWinnerIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "tournament_shell_advancement_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tournament_shell_name_records" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "generatedName" TEXT NOT NULL,
    "finalName" TEXT NOT NULL,
    "wasEdited" BOOLEAN NOT NULL DEFAULT false,
    "namingMode" TEXT NOT NULL,
    "generationPrompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_shell_name_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tournament_shell_announcements" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundNumber" INTEGER,
    "conferenceId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL DEFAULT 'all',
    "isPosted" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_shell_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tournament_shell_audit_logs" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundNumber" INTEGER,
    "action" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_shell_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "chat_gifs" (
    "id" TEXT NOT NULL,
    "giphyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "previewUrl" TEXT NOT NULL,
    "tags" TEXT[],
    "category" TEXT NOT NULL DEFAULT 'general',
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_gifs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "chat_emojis" (
    "id" TEXT NOT NULL,
    "char" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortcode" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "chat_emojis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "league_chat_messages" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(32) NOT NULL DEFAULT 'text',
    "imageUrl" TEXT,
    "metadata" JSONB,
    "source" VARCHAR(16),
    "discordMessageId" VARCHAR(64),
    "sourceDiscord" BOOLEAN NOT NULL DEFAULT false,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "visibleToUserId" TEXT,
    "messageSubtype" VARCHAR(32),
    "mentionedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "globalBroadcastId" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "supplemental_drafts" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "scenario" VARCHAR(32) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'pending',
    "participantRosterIds" TEXT[],
    "passedRosterIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "draftOrder" TEXT[],
    "currentPickIndex" INTEGER NOT NULL DEFAULT 0,
    "totalRounds" INTEGER NOT NULL DEFAULT 0,
    "picksPerRound" INTEGER NOT NULL DEFAULT 0,
    "sourceRosterIds" TEXT[],
    "assetPool" JSONB NOT NULL DEFAULT '[]',
    "orderMode" VARCHAR(24) NOT NULL DEFAULT 'randomized',
    "draftType" VARCHAR(16) NOT NULL DEFAULT 'linear',
    "pickTimeSeconds" INTEGER NOT NULL DEFAULT 120,
    "autoPickOnTimeout" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplemental_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "supplemental_draft_picks" (
    "id" TEXT NOT NULL,
    "supplementalDraftId" TEXT NOT NULL,
    "pickNumber" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "pickInRound" INTEGER NOT NULL,
    "rosterId" TEXT NOT NULL,
    "assetType" VARCHAR(24),
    "assetId" VARCHAR(128),
    "assetDisplayName" VARCHAR(256),
    "isPassed" BOOLEAN NOT NULL DEFAULT false,
    "pickedAt" TIMESTAMP(3),

    CONSTRAINT "supplemental_draft_picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_commissioner_configs" (
    "configId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "sport" "LeagueSport" NOT NULL DEFAULT 'NFL',
    "remindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "disputeAnalysisEnabled" BOOLEAN NOT NULL DEFAULT true,
    "collusionMonitoringEnabled" BOOLEAN NOT NULL DEFAULT true,
    "voteSuggestionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inactivityMonitoringEnabled" BOOLEAN NOT NULL DEFAULT true,
    "commissionerNotificationMode" VARCHAR(24) NOT NULL DEFAULT 'in_app',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_commissioner_configs_pkey" PRIMARY KEY ("configId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_commissioner_alerts" (
    "alertId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "sport" "LeagueSport" NOT NULL DEFAULT 'NFL',
    "alertType" VARCHAR(48) NOT NULL,
    "severity" VARCHAR(16) NOT NULL DEFAULT 'medium',
    "headline" VARCHAR(220) NOT NULL,
    "summary" TEXT NOT NULL,
    "relatedManagerIds" JSONB DEFAULT '[]',
    "relatedTradeId" VARCHAR(128),
    "relatedMatchupId" VARCHAR(128),
    "status" VARCHAR(24) NOT NULL DEFAULT 'open',
    "snoozedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_commissioner_alerts_pkey" PRIMARY KEY ("alertId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_commissioner_action_logs" (
    "actionId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "sport" "LeagueSport" NOT NULL DEFAULT 'NFL',
    "actionType" VARCHAR(48) NOT NULL,
    "source" VARCHAR(48) NOT NULL,
    "summary" TEXT NOT NULL,
    "relatedAlertId" VARCHAR(128),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_commissioner_action_logs_pkey" PRIMARY KEY ("actionId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LeagueInvite" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER NOT NULL DEFAULT 50,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LeagueManagerClaim" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "afUserId" TEXT NOT NULL,
    "teamExternalId" TEXT NOT NULL,
    "platformUserId" TEXT,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LeagueManagerClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "find_league_listings" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "headline" VARCHAR(256) NOT NULL DEFAULT '',
    "body" TEXT,
    "sport" "LeagueSport" NOT NULL DEFAULT 'NFL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "find_league_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "rosters" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "playerData" JSONB NOT NULL,
    "settings" JSONB,
    "faabRemaining" INTEGER,
    "waiverPriority" INTEGER,
    "supplementalDraftPasses" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "league_teams" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "isCommissioner" BOOLEAN NOT NULL DEFAULT false,
    "isCoCommissioner" BOOLEAN NOT NULL DEFAULT false,
    "isOrphan" BOOLEAN NOT NULL DEFAULT false,
    "claimedByUserId" TEXT,
    "platformUserId" TEXT,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsAgainst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentRank" INTEGER,
    "aiPowerScore" DOUBLE PRECISION,
    "projectedWins" DOUBLE PRECISION,
    "strengthNotes" TEXT,
    "riskNotes" TEXT,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "divisionId" VARCHAR(64),
    "legacyRosterId" TEXT,

    CONSTRAINT "league_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "league_divisions" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "tierLevel" INTEGER NOT NULL DEFAULT 1,
    "sport" VARCHAR(16) NOT NULL,
    "name" VARCHAR(128),

    CONSTRAINT "league_divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "promotion_rules" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "fromTierLevel" INTEGER NOT NULL DEFAULT 1,
    "toTierLevel" INTEGER NOT NULL DEFAULT 2,
    "promoteCount" INTEGER NOT NULL DEFAULT 1,
    "relegateCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "promotion_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "team_performances" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "opponent" TEXT,
    "result" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_performances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "league_auths" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "apiKey" TEXT,
    "oauthToken" TEXT,
    "oauthSecret" TEXT,
    "espnSwid" TEXT,
    "espnS2" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_auths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "league_waiver_settings" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "waiverType" TEXT NOT NULL DEFAULT 'standard',
    "processingDayOfWeek" INTEGER,
    "processingTimeUtc" TEXT,
    "claimLimitPerPeriod" INTEGER,
    "faabBudget" INTEGER,
    "faabResetDate" TIMESTAMP(3),
    "tiebreakRule" TEXT,
    "lockType" TEXT,
    "instantFaAfterClear" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_waiver_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "guillotine_league_configs" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "eliminationStartWeek" INTEGER NOT NULL DEFAULT 1,
    "eliminationEndWeek" INTEGER,
    "teamsPerChop" INTEGER NOT NULL DEFAULT 1,
    "correctionWindow" VARCHAR(32) NOT NULL DEFAULT 'after_stat_corrections',
    "customCutoffDayOfWeek" INTEGER,
    "customCutoffTimeUtc" VARCHAR(16),
    "statCorrectionHours" INTEGER DEFAULT 48,
    "tiebreakerOrder" JSONB,
    "dangerMarginPoints" DOUBLE PRECISION DEFAULT 10,
    "rosterReleaseTiming" VARCHAR(32) NOT NULL DEFAULT 'next_waiver_run',
    "commissionerOverride" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guillotine_league_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "guillotine_roster_states" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "choppedAt" TIMESTAMP(3),
    "choppedInPeriod" INTEGER,
    "choppedReason" VARCHAR(128),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guillotine_roster_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "guillotine_period_scores" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "weekOrPeriod" INTEGER NOT NULL,
    "season" INTEGER,
    "periodPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "seasonPointsCumul" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guillotine_period_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "guillotine_event_logs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guillotine_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "salary_cap_league_configs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "mode" VARCHAR(24) NOT NULL DEFAULT 'dynasty',
    "startupCap" INTEGER NOT NULL DEFAULT 250,
    "capGrowthPercent" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "contractMinYears" INTEGER NOT NULL DEFAULT 1,
    "contractMaxYears" INTEGER NOT NULL DEFAULT 4,
    "rookieContractYears" INTEGER NOT NULL DEFAULT 3,
    "minimumSalary" INTEGER NOT NULL DEFAULT 1,
    "deadMoneyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "deadMoneyPercentPerYear" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "rolloverEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rolloverMax" INTEGER NOT NULL DEFAULT 25,
    "capFloorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "capFloorAmount" INTEGER,
    "extensionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "franchiseTagEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rookieOptionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "startupDraftType" VARCHAR(24) NOT NULL DEFAULT 'auction',
    "futureDraftType" VARCHAR(24) NOT NULL DEFAULT 'linear',
    "auctionHoldback" INTEGER NOT NULL DEFAULT 50,
    "weightedLotteryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lotteryOddsConfig" JSONB,
    "compPickEnabled" BOOLEAN NOT NULL DEFAULT false,
    "compPickFormula" JSONB,
    "offseasonPhase" VARCHAR(32),
    "offseasonPhaseEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_cap_league_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "salary_cap_team_ledgers" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "capYear" INTEGER NOT NULL,
    "totalCapHit" INTEGER NOT NULL DEFAULT 0,
    "deadMoneyHit" INTEGER NOT NULL DEFAULT 0,
    "rolloverUsed" INTEGER NOT NULL DEFAULT 0,
    "capSpace" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_cap_team_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "player_contracts" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "playerId" VARCHAR(64) NOT NULL,
    "playerName" VARCHAR(128),
    "position" VARCHAR(16),
    "salary" INTEGER NOT NULL,
    "yearsTotal" INTEGER NOT NULL,
    "yearSigned" INTEGER NOT NULL,
    "contractYear" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(24) NOT NULL DEFAULT 'active',
    "source" VARCHAR(32) NOT NULL,
    "franchiseTagAt" TIMESTAMP(3),
    "optionExercisedAt" TIMESTAMP(3),
    "cutAt" TIMESTAMP(3),
    "deadMoneyRemaining" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "salary_cap_event_logs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_cap_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "salary_cap_lottery_results" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "capYear" INTEGER NOT NULL,
    "seed" VARCHAR(64),
    "order" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_cap_lottery_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_league_configs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "mode" VARCHAR(24) NOT NULL DEFAULT 'redraft',
    "tribeCount" INTEGER NOT NULL DEFAULT 4,
    "tribeSize" INTEGER NOT NULL DEFAULT 4,
    "tribeFormation" VARCHAR(24) NOT NULL DEFAULT 'random',
    "mergeTrigger" VARCHAR(24) NOT NULL DEFAULT 'week',
    "mergeWeek" INTEGER,
    "mergePlayerCount" INTEGER,
    "juryStartAfterMerge" INTEGER NOT NULL DEFAULT 1,
    "exileReturnEnabled" BOOLEAN NOT NULL DEFAULT false,
    "exileReturnTokens" INTEGER NOT NULL DEFAULT 4,
    "idolCount" INTEGER NOT NULL DEFAULT 2,
    "idolPowerPool" JSONB,
    "tribeShuffleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tribeShuffleConsecutiveLosses" INTEGER,
    "tribeShuffleImbalanceThreshold" DOUBLE PRECISION,
    "voteDeadlineDayOfWeek" INTEGER,
    "voteDeadlineTimeUtc" VARCHAR(16),
    "selfVoteDisallowed" BOOLEAN NOT NULL DEFAULT true,
    "tribalCouncilDayOfWeek" INTEGER,
    "tribalCouncilTimeUtc" VARCHAR(16),
    "minigameFrequency" VARCHAR(24) NOT NULL DEFAULT 'none',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survivor_league_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_tribes" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "slotIndex" INTEGER NOT NULL DEFAULT 0,
    "logoUrl" TEXT,
    "colorHex" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isMerged" BOOLEAN NOT NULL DEFAULT false,
    "phase" VARCHAR(24) NOT NULL DEFAULT 'pre_merge',
    "chatChannelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survivor_tribes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_tribe_members" (
    "id" TEXT NOT NULL,
    "tribeId" TEXT NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_tribe_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_idols" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "playerId" VARCHAR(64) NOT NULL,
    "powerType" VARCHAR(64) NOT NULL,
    "powerCategory" VARCHAR(64),
    "powerLabel" VARCHAR(160),
    "powerDesc" TEXT,
    "currentOwnerUserId" VARCHAR(64),
    "originalOwnerUserId" VARCHAR(64),
    "isSecret" BOOLEAN NOT NULL DEFAULT true,
    "isPubliclyKnown" BOOLEAN NOT NULL DEFAULT false,
    "isTradable" BOOLEAN NOT NULL DEFAULT false,
    "transferHistory" JSONB,
    "playWindowRule" VARCHAR(32) NOT NULL DEFAULT 'before_reveal',
    "rarity" VARCHAR(24) NOT NULL DEFAULT 'common',
    "expiresAtMerge" BOOLEAN NOT NULL DEFAULT true,
    "expiresAtWeek" INTEGER,
    "usedAtCouncilId" VARCHAR(64),
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(24) NOT NULL DEFAULT 'hidden',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "validUntilPhase" VARCHAR(32),
    "auditLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survivor_idols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_idol_ledger_entries" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "idolId" TEXT NOT NULL,
    "eventType" VARCHAR(32) NOT NULL,
    "fromRosterId" VARCHAR(64),
    "toRosterId" VARCHAR(64),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_idol_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_tribal_councils" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "councilNumber" INTEGER NOT NULL DEFAULT 1,
    "phase" VARCHAR(24) NOT NULL,
    "attendingTribeId" VARCHAR(64),
    "status" VARCHAR(24) NOT NULL DEFAULT 'pending',
    "votingOpensAt" TIMESTAMP(3),
    "voteDeadlineAt" TIMESTAMP(3) NOT NULL,
    "votingDeadline" TIMESTAMP(3),
    "revealStartsAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "eliminatedRosterId" VARCHAR(64),
    "eliminatedUserId" VARCHAR(64),
    "eliminatedName" VARCHAR(160),
    "isTie" BOOLEAN NOT NULL DEFAULT false,
    "tiePhase" VARCHAR(32),
    "tiePlayerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rockDrawerUserId" VARCHAR(64),
    "idolsPlayed" JSONB,
    "nullifiersPlayed" JSONB,
    "doesNotCountVoteIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "revealSequence" JSONB,
    "isRevealed" BOOLEAN NOT NULL DEFAULT false,
    "auditLog" JSONB,
    "tieBreakSeasonPoints" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survivor_tribal_councils_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_votes" (
    "id" TEXT NOT NULL,
    "councilId" TEXT NOT NULL,
    "leagueId" VARCHAR(64),
    "voterRosterId" VARCHAR(64) NOT NULL,
    "targetRosterId" VARCHAR(64) NOT NULL,
    "voterUserId" VARCHAR(64),
    "targetUserId" VARCHAR(64),
    "voterName" VARCHAR(160),
    "targetName" VARCHAR(160),
    "isDoubleVote" BOOLEAN NOT NULL DEFAULT false,
    "doesNotCount" BOOLEAN NOT NULL DEFAULT false,
    "nullifiedBy" VARCHAR(64),
    "isLateVote" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_exile_leagues" (
    "id" TEXT NOT NULL,
    "mainLeagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "exileLeagueId" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_exile_leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_exile_tokens" (
    "id" TEXT NOT NULL,
    "exileLeagueId" VARCHAR(64) NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "lastAwardedWeek" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survivor_exile_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_jury_members" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "votedOutWeek" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_jury_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_audit_logs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_challenges" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "challengeNumber" INTEGER NOT NULL DEFAULT 1,
    "challengeType" VARCHAR(64) NOT NULL,
    "type" VARCHAR(64),
    "title" VARCHAR(256) NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "instructions" TEXT NOT NULL DEFAULT '',
    "scope" VARCHAR(24) NOT NULL DEFAULT 'tribe',
    "submissionMode" VARCHAR(32) NOT NULL DEFAULT 'tribe_chat',
    "configJson" JSONB,
    "lockAt" TIMESTAMP(3),
    "locksAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "status" VARCHAR(24) NOT NULL DEFAULT 'open',
    "rewardType" VARCHAR(64),
    "rewardAmount" DOUBLE PRECISION,
    "rewardDetails" JSONB,
    "penaltyType" VARCHAR(64),
    "penaltyDetails" JSONB,
    "winnerUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "winnerTribeId" VARCHAR(64),
    "resultSummary" TEXT,
    "auditLog" JSONB,
    "resultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survivor_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_challenge_submissions" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "leagueId" VARCHAR(64),
    "userId" VARCHAR(64),
    "rosterId" VARCHAR(64),
    "tribeId" VARCHAR(64),
    "submission" JSONB NOT NULL,
    "isCorrect" BOOLEAN,
    "pointsEarned" DOUBLE PRECISION,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_challenge_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_tribe_chat_members" (
    "id" TEXT NOT NULL,
    "tribeId" TEXT NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "userId" VARCHAR(64),
    "isAiHost" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_tribe_chat_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_players" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "tribeId" TEXT,
    "playerState" TEXT NOT NULL DEFAULT 'active',
    "eliminatedWeek" INTEGER,
    "eliminationRound" INTEGER,
    "idolIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tokenBalance" INTEGER NOT NULL DEFAULT 0,
    "totalTokensEarned" INTEGER NOT NULL DEFAULT 0,
    "hasImmunityThisWeek" BOOLEAN NOT NULL DEFAULT false,
    "immunitySource" TEXT,
    "exileReturnEligible" BOOLEAN NOT NULL DEFAULT false,
    "exileWeeksServed" INTEGER NOT NULL DEFAULT 0,
    "redraftRosterId" TEXT,
    "canAccessTribeChat" BOOLEAN NOT NULL DEFAULT true,
    "canAccessMergeChat" BOOLEAN NOT NULL DEFAULT false,
    "canAccessExileChat" BOOLEAN NOT NULL DEFAULT false,
    "canAccessJuryChat" BOOLEAN NOT NULL DEFAULT false,
    "canAccessFinaleChat" BOOLEAN NOT NULL DEFAULT false,
    "isJuryMember" BOOLEAN NOT NULL DEFAULT false,
    "isFinalist" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survivor_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_jury_sessions" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "finalistUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "jurorUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "questionsDeadline" TIMESTAMP(3),
    "votingDeadline" TIMESTAMP(3),
    "winnerId" TEXT,
    "winnerName" TEXT,
    "revealedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_jury_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_jury_votes" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "jurorUserId" TEXT NOT NULL,
    "finalistUserId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "survivor_jury_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_host_messages" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "tribeId" TEXT,
    "targetUserId" TEXT,
    "messageType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPosted" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" TIMESTAMP(3),
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_host_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_chat_channels" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "tribeId" TEXT,
    "memberUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "readOnlyUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survivor_chat_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_tribe_swaps" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "swapType" TEXT NOT NULL DEFAULT 'random_shuffle',
    "beforeSnapshot" JSONB NOT NULL,
    "afterSnapshot" JSONB NOT NULL,
    "newTribes" JSONB,
    "originalTribesRetained" BOOLEAN NOT NULL DEFAULT true,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_tribe_swaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_token_pool_picks" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "sport" TEXT NOT NULL,
    "pickType" TEXT NOT NULL,
    "pick" JSONB NOT NULL,
    "isCorrect" BOOLEAN,
    "tokensEarned" INTEGER NOT NULL DEFAULT 0,
    "tokensLost" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_token_pool_picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_exile_islands" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "currentWeek" INTEGER NOT NULL DEFAULT 0,
    "bossName" TEXT DEFAULT 'The Exile Boss',
    "bossRosterId" TEXT,
    "bossWinsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "bossTokenResetOnWin" BOOLEAN NOT NULL DEFAULT true,
    "chatChannelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_exile_islands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_exile_weekly_entries" (
    "id" TEXT NOT NULL,
    "exileId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "submittedLineup" JSONB,
    "weeklyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bossScore" DOUBLE PRECISION,
    "bossWon" BOOLEAN NOT NULL DEFAULT false,
    "tokenEarned" INTEGER NOT NULL DEFAULT 0,
    "tokenWiped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "survivor_exile_weekly_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_power_templates" (
    "id" TEXT NOT NULL,
    "powerType" TEXT NOT NULL,
    "powerLabel" TEXT NOT NULL,
    "powerCategory" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "exactBehavior" TEXT NOT NULL,
    "useWindow" TEXT NOT NULL,
    "phaseValidity" TEXT NOT NULL DEFAULT 'both',
    "targetType" TEXT NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT true,
    "expirationRule" TEXT NOT NULL,
    "isTradable" BOOLEAN NOT NULL DEFAULT false,
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "recommendedFreq" TEXT NOT NULL,
    "maxPerSeason" INTEGER NOT NULL DEFAULT 1,
    "maxPerPlayer" INTEGER NOT NULL DEFAULT 1,
    "maxConcurrentLeague" INTEGER NOT NULL DEFAULT 3,
    "abusePreventionRules" TEXT NOT NULL,
    "revealBehavior" TEXT NOT NULL,
    "aiValidationRequired" TEXT NOT NULL,
    "auditRequirements" TEXT NOT NULL,
    "isDraftDefault" BOOLEAN NOT NULL DEFAULT false,
    "isAdvanced" BOOLEAN NOT NULL DEFAULT false,
    "isDisadvantage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_power_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_season_arc_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "playerCount" INTEGER NOT NULL,
    "tribeCount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "arcSteps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_season_arc_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_challenge_templates" (
    "id" TEXT NOT NULL,
    "challengeKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'tribe',
    "inputDescription" TEXT NOT NULL,
    "submissionChannel" TEXT NOT NULL DEFAULT 'tribe_chat',
    "deadlineBehavior" TEXT NOT NULL DEFAULT '',
    "tiebreakerRule" TEXT NOT NULL DEFAULT '',
    "defaultRewardType" TEXT NOT NULL DEFAULT '',
    "defaultPenaltyType" TEXT,
    "affectsImmunity" BOOLEAN NOT NULL DEFAULT false,
    "affectsFaab" BOOLEAN NOT NULL DEFAULT false,
    "grantsIdol" BOOLEAN NOT NULL DEFAULT false,
    "grantsDisadvantage" BOOLEAN NOT NULL DEFAULT false,
    "aiCanAutoGenerate" BOOLEAN NOT NULL DEFAULT true,
    "commissionerApprovalRecommended" BOOLEAN NOT NULL DEFAULT false,
    "phaseValidity" TEXT NOT NULL DEFAULT 'pre_merge',
    "sportAdaptation" JSONB,
    "notes" TEXT,
    "extraMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_challenge_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_power_balances" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "activePowerCount" INTEGER NOT NULL DEFAULT 0,
    "immunityPowerCount" INTEGER NOT NULL DEFAULT 0,
    "voteControlCount" INTEGER NOT NULL DEFAULT 0,
    "scorePowerCount" INTEGER NOT NULL DEFAULT 0,
    "tribeControlCount" INTEGER NOT NULL DEFAULT 0,
    "infoPowerCount" INTEGER NOT NULL DEFAULT 0,
    "powersByPlayer" JSONB NOT NULL DEFAULT '{}',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_power_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_twist_events" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "twistType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affectedPlayerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "affectedTribeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "wasAutoTriggered" BOOLEAN NOT NULL DEFAULT true,
    "commissionerNote" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_twist_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_audit_entries" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "week" INTEGER,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "targetUserId" TEXT,
    "targetTribeId" TEXT,
    "relatedEntityId" TEXT,
    "relatedEntityType" TEXT,
    "data" JSONB NOT NULL,
    "isVisibleToCommissioner" BOOLEAN NOT NULL DEFAULT true,
    "isVisibleToPublic" BOOLEAN NOT NULL DEFAULT false,
    "isRevealablePostSeason" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_game_states" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "phase" TEXT NOT NULL DEFAULT 'pre_draft',
    "currentWeek" INTEGER NOT NULL DEFAULT 0,
    "totalTribalCouncils" INTEGER NOT NULL DEFAULT 0,
    "activeTribeCount" INTEGER NOT NULL DEFAULT 0,
    "activePlayerCount" INTEGER NOT NULL DEFAULT 0,
    "exilePlayerCount" INTEGER NOT NULL DEFAULT 0,
    "juryPlayerCount" INTEGER NOT NULL DEFAULT 0,
    "draftCompletedAt" TIMESTAMP(3),
    "preMergeStartedAt" TIMESTAMP(3),
    "mergeTriggeredAt" TIMESTAMP(3),
    "juryStartedAt" TIMESTAMP(3),
    "finaleStartedAt" TIMESTAMP(3),
    "seasonCompletedAt" TIMESTAMP(3),
    "weekStartedAt" TIMESTAMP(3),
    "weekScoringLockedAt" TIMESTAMP(3),
    "weekScoringFinalAt" TIMESTAMP(3),
    "activeChallengeId" TEXT,
    "challengeLockedAt" TIMESTAMP(3),
    "challengeResultAt" TIMESTAMP(3),
    "activeCouncilId" TEXT,
    "tribalOpenedAt" TIMESTAMP(3),
    "tribalDeadline" TIMESTAMP(3),
    "tribalRevealAt" TIMESTAMP(3),
    "tribalCompleteAt" TIMESTAMP(3),
    "immuneTribeId" TEXT,
    "immunePlayerId" TEXT,
    "needsChallengeLock" BOOLEAN NOT NULL DEFAULT false,
    "needsWaiverProcess" BOOLEAN NOT NULL DEFAULT false,
    "needsExileScore" BOOLEAN NOT NULL DEFAULT false,
    "needsTribalLock" BOOLEAN NOT NULL DEFAULT false,
    "needsPhaseAdvance" BOOLEAN NOT NULL DEFAULT false,
    "needsWeeklyRecap" BOOLEAN NOT NULL DEFAULT false,
    "needsPowerRankings" BOOLEAN NOT NULL DEFAULT false,
    "lastAutomationRun" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survivor_game_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_phase_transitions" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "fromPhase" TEXT NOT NULL,
    "toPhase" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "triggeredByUserId" TEXT,
    "notes" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_phase_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_notifications" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "recipientUserId" TEXT,
    "recipientRole" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deepLinkPath" TEXT,
    "isSpoilerSafe" BOOLEAN NOT NULL DEFAULT true,
    "urgency" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_chat_messages" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderIsHost" BOOLEAN NOT NULL DEFAULT false,
    "isSystemMessage" BOOLEAN NOT NULL DEFAULT false,
    "content" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'text',
    "cardData" JSONB,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" TIMESTAMP(3),
    "pinnedBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_chat_reactions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_chat_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_commissioner_actions" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "commissionerId" TEXT NOT NULL,
    "week" INTEGER,
    "actionType" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetTribeId" TEXT,
    "description" TEXT NOT NULL,
    "previousState" JSONB,
    "newState" JSONB,
    "wasConfirmed" BOOLEAN NOT NULL DEFAULT true,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_commissioner_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_season_snapshots" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "season" INTEGER NOT NULL,
    "solesurvivor" JSONB NOT NULL,
    "finalStandings" JSONB NOT NULL,
    "totalWeeks" INTEGER NOT NULL,
    "totalTribes" INTEGER NOT NULL,
    "totalTribalCouncils" INTEGER NOT NULL,
    "totalIdolsPlayed" INTEGER NOT NULL,
    "totalTokensEarned" INTEGER NOT NULL,
    "totalChallenges" INTEGER NOT NULL,
    "hadTie" BOOLEAN NOT NULL,
    "hadRocks" BOOLEAN NOT NULL,
    "firstElimination" JSONB NOT NULL,
    "mergeWeek" INTEGER NOT NULL,
    "exileReturnees" JSONB NOT NULL,
    "juryStartWeek" INTEGER NOT NULL,
    "winnerVoteCount" INTEGER NOT NULL,
    "winnerId" TEXT NOT NULL,
    "episodeSummaries" JSONB NOT NULL,
    "aiSeasonRecap" TEXT,
    "aiChampionArc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_season_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "survivor_weekly_scores" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "userId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "fantasyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointBoostApplied" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointPenaltyApplied" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tribeId" TEXT,
    "countedTowardTribeTotal" BOOLEAN NOT NULL DEFAULT true,
    "wonTribeImmunity" BOOLEAN NOT NULL DEFAULT false,
    "wonIndividualImmunity" BOOLEAN NOT NULL DEFAULT false,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" TIMESTAMP(3),
    "correctionApplied" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "survivor_weekly_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "big_brother_league_configs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "hohChallengeDayOfWeek" INTEGER,
    "hohChallengeTimeUtc" VARCHAR(16),
    "nominationDeadlineDayOfWeek" INTEGER,
    "nominationDeadlineTimeUtc" VARCHAR(16),
    "vetoDrawDayOfWeek" INTEGER,
    "vetoDrawTimeUtc" VARCHAR(16),
    "vetoDecisionDeadlineDayOfWeek" INTEGER,
    "vetoDecisionDeadlineTimeUtc" VARCHAR(16),
    "replacementNomineeDeadlineDayOfWeek" INTEGER,
    "replacementNomineeDeadlineTimeUtc" VARCHAR(16),
    "evictionVoteOpenDayOfWeek" INTEGER,
    "evictionVoteOpenTimeUtc" VARCHAR(16),
    "evictionVoteCloseDayOfWeek" INTEGER,
    "evictionVoteCloseTimeUtc" VARCHAR(16),
    "finalNomineeCount" INTEGER NOT NULL DEFAULT 2,
    "vetoCompetitorCount" INTEGER NOT NULL DEFAULT 6,
    "consecutiveHohAllowed" BOOLEAN NOT NULL DEFAULT false,
    "hohVotesOnlyInTie" BOOLEAN NOT NULL DEFAULT true,
    "juryStartMode" VARCHAR(32) NOT NULL DEFAULT 'after_eliminations',
    "juryStartAfterEliminations" INTEGER,
    "juryStartWhenRemaining" INTEGER,
    "juryStartWeek" INTEGER,
    "finaleFormat" VARCHAR(16) NOT NULL DEFAULT 'final_2',
    "waiverReleaseTiming" VARCHAR(32) NOT NULL DEFAULT 'next_waiver_run',
    "publicVoteTotalsVisibility" VARCHAR(24) NOT NULL DEFAULT 'evicted_only',
    "challengeMode" VARCHAR(32) NOT NULL DEFAULT 'hybrid',
    "antiCollusionLogging" BOOLEAN NOT NULL DEFAULT true,
    "inactivePlayerHandling" VARCHAR(32) NOT NULL DEFAULT 'commissioner_only',
    "autoNominationFallback" VARCHAR(32) NOT NULL DEFAULT 'lowest_season_points',
    "evictionTieBreakMode" VARCHAR(24) NOT NULL DEFAULT 'season_points',
    "weekProgressionPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "big_brother_league_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "big_brother_cycles" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "phase" VARCHAR(40) NOT NULL DEFAULT 'HOH_OPEN',
    "hohRosterId" VARCHAR(64),
    "nominee1RosterId" VARCHAR(64),
    "nominee2RosterId" VARCHAR(64),
    "vetoWinnerRosterId" VARCHAR(64),
    "vetoParticipantRosterIds" JSONB,
    "vetoUsed" BOOLEAN NOT NULL DEFAULT false,
    "vetoSavedRosterId" VARCHAR(64),
    "replacementNomineeRosterId" VARCHAR(64),
    "evictedRosterId" VARCHAR(64),
    "voteDeadlineAt" TIMESTAMP(3),
    "voteOpenedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "tieBreakSeasonPoints" JSONB,
    "voteProgressMessageId" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "big_brother_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "big_brother_eviction_votes" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "voterRosterId" VARCHAR(64) NOT NULL,
    "targetRosterId" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "big_brother_eviction_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "big_brother_jury_members" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "evictedWeek" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "big_brother_jury_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "big_brother_finale_votes" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "juryRosterId" VARCHAR(64) NOT NULL,
    "targetRosterId" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "big_brother_finale_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "big_brother_audit_logs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "big_brother_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "big_brother_chat_command_logs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "userId" TEXT NOT NULL,
    "cycleId" VARCHAR(64),
    "rawMessage" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" VARCHAR(128),
    "commandType" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "big_brother_chat_command_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_universes" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "sport" VARCHAR(12) NOT NULL DEFAULT 'NFL',
    "settings" JSONB,
    "status" TEXT NOT NULL DEFAULT 'setup',
    "tiersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tierCount" INTEGER NOT NULL DEFAULT 3,
    "namingMode" TEXT NOT NULL DEFAULT 'hybrid',
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "defaultBuyIn" DOUBLE PRECISION,
    "newMembersStartAtBottom" BOOLEAN NOT NULL DEFAULT true,
    "promotionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "relegationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "promotionCount" INTEGER NOT NULL DEFAULT 2,
    "relegationCount" INTEGER NOT NULL DEFAULT 2,
    "promotionMode" TEXT NOT NULL DEFAULT 'auto',
    "commissionedByUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zombie_universes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_universe_levels" (
    "id" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "rankOrder" INTEGER NOT NULL DEFAULT 1,
    "tierLabel" VARCHAR(64),
    "tierLevel" INTEGER,
    "tierTheme" TEXT,
    "colorHex" TEXT,
    "logoUrl" TEXT,
    "defaultBuyIn" DOUBLE PRECISION,
    "ambushCountDefault" INTEGER NOT NULL DEFAULT 3,
    "difficultyLabel" TEXT,
    "maxLeagues" INTEGER NOT NULL DEFAULT 4,
    "teamsPerLeague" INTEGER NOT NULL DEFAULT 20,
    "leagueCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zombie_universe_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_leagues" (
    "id" TEXT NOT NULL,
    "universeId" TEXT,
    "levelId" TEXT,
    "leagueId" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128),
    "slug" VARCHAR(160) NOT NULL DEFAULT '',
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "colorHex" TEXT,
    "themeLabel" TEXT,
    "sport" VARCHAR(12) NOT NULL DEFAULT 'NFL',
    "season" INTEGER NOT NULL DEFAULT 2026,
    "isSingleLeague" BOOLEAN NOT NULL DEFAULT false,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'setup',
    "teamCount" INTEGER NOT NULL DEFAULT 20,
    "currentTeamCount" INTEGER NOT NULL DEFAULT 0,
    "whispererSelectionMode" TEXT NOT NULL DEFAULT 'random',
    "whispererAmbushCount" INTEGER NOT NULL DEFAULT 3,
    "whispererIsPublic" BOOLEAN NOT NULL DEFAULT true,
    "draftScheduledAt" TIMESTAMP(3),
    "seasonStartWeek" INTEGER,
    "currentWeek" INTEGER NOT NULL DEFAULT 0,
    "totalWeeks" INTEGER NOT NULL DEFAULT 17,
    "buyInAmount" DOUBLE PRECISION,
    "commissionerFee" DOUBLE PRECISION DEFAULT 0,
    "potTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weeklyPayoutEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ultimateSurvivorPot" BOOLEAN NOT NULL DEFAULT false,
    "commissionerId" TEXT,
    "namingMode" TEXT NOT NULL DEFAULT 'hybrid',
    "weeklyUpdateDay" INTEGER,
    "weeklyUpdateHour" INTEGER,
    "weeklyUpdateAutoPost" BOOLEAN NOT NULL DEFAULT true,
    "weeklyUpdateApproval" BOOLEAN NOT NULL DEFAULT false,
    "updateIncludeProjections" BOOLEAN NOT NULL DEFAULT true,
    "updateIncludeMoney" BOOLEAN NOT NULL DEFAULT true,
    "updateIncludeInventory" BOOLEAN NOT NULL DEFAULT true,
    "updateIncludeUniverse" BOOLEAN NOT NULL DEFAULT true,
    "updateIncludeDanger" BOOLEAN NOT NULL DEFAULT true,
    "orderInLevel" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "commissionerUiPrefs" JSONB,

    CONSTRAINT "zombie_leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_whisperer_records" (
    "id" TEXT NOT NULL,
    "zombieLeagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "selectionMode" TEXT NOT NULL,
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPubliclyRevealed" BOOLEAN NOT NULL DEFAULT true,
    "revealedAt" TIMESTAMP(3),
    "ambushesGranted" INTEGER NOT NULL DEFAULT 3,
    "ambushesUsed" INTEGER NOT NULL DEFAULT 0,
    "ambushesRemaining" INTEGER NOT NULL DEFAULT 3,
    "activePowers" JSONB,
    "wasDefeated" BOOLEAN NOT NULL DEFAULT false,
    "defeatedAtWeek" INTEGER,
    "defeatedByUserId" TEXT,
    "postDefeatRule" TEXT,
    "hordeSizeAtPeak" INTEGER NOT NULL DEFAULT 0,
    "totalInfections" INTEGER NOT NULL DEFAULT 0,
    "totalWinningsStolen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_whisperer_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_infection_events" (
    "id" TEXT NOT NULL,
    "zombieLeagueId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "infectorUserId" TEXT NOT NULL,
    "infectorStatus" TEXT NOT NULL,
    "infectorName" TEXT NOT NULL,
    "victimUserId" TEXT NOT NULL,
    "victimName" TEXT NOT NULL,
    "victimPriorStatus" TEXT NOT NULL,
    "victimNewStatus" TEXT NOT NULL,
    "winningsTransferred" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "itemsTransferred" JSONB,
    "infectorScore" DOUBLE PRECISION NOT NULL,
    "victimScore" DOUBLE PRECISION NOT NULL,
    "scoreDifference" DOUBLE PRECISION NOT NULL,
    "isStatCorrected" BOOLEAN NOT NULL DEFAULT false,
    "correctedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_infection_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_weekly_resolutions" (
    "id" TEXT NOT NULL,
    "zombieLeagueId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "matchupResults" JSONB NOT NULL,
    "newZombies" TEXT[],
    "infectionCount" INTEGER NOT NULL DEFAULT 0,
    "hordeSize" INTEGER NOT NULL DEFAULT 0,
    "survivorCount" INTEGER NOT NULL DEFAULT 0,
    "weeklyWinningsPool" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "winningsDistribution" JSONB,
    "ambushEvents" JSONB,
    "itemEvents" JSONB,
    "serumAwards" JSONB,
    "weaponAwards" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "requiresStatCorrection" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_weekly_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_item_templates" (
    "id" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "useWindow" TEXT NOT NULL,
    "phaseValidity" TEXT NOT NULL DEFAULT 'both',
    "targetType" TEXT NOT NULL,
    "isConsumable" BOOLEAN NOT NULL DEFAULT true,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "survivorCanHold" BOOLEAN NOT NULL DEFAULT true,
    "zombieCanHold" BOOLEAN NOT NULL DEFAULT true,
    "whispererCanHold" BOOLEAN NOT NULL DEFAULT true,
    "abusePreventionRules" TEXT,
    "auditRequirements" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_item_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_universe_stats" (
    "id" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "leagueName" TEXT NOT NULL,
    "tierLabel" TEXT,
    "currentStatus" TEXT NOT NULL DEFAULT 'survivor',
    "isWhisperer" BOOLEAN NOT NULL DEFAULT false,
    "careerWins" INTEGER NOT NULL DEFAULT 0,
    "careerLosses" INTEGER NOT NULL DEFAULT 0,
    "careerPointsFor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "careerInfections" INTEGER NOT NULL DEFAULT 0,
    "careerTimesInfected" INTEGER NOT NULL DEFAULT 0,
    "careerWinnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "careerSurvivorWeeks" INTEGER NOT NULL DEFAULT 0,
    "careerZombieWeeks" INTEGER NOT NULL DEFAULT 0,
    "careerWhispererSeasons" INTEGER NOT NULL DEFAULT 0,
    "currentSeasonPPW" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentSeasonWinPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weekKilled" INTEGER,
    "killedByUserId" TEXT,
    "universeRank" INTEGER,
    "tierRank" INTEGER,
    "projectedNextTier" TEXT,
    "projectedMovement" TEXT,
    "season" INTEGER NOT NULL,
    "lastUpdatedWeek" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zombie_universe_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_movement_records" (
    "id" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "fromTierLabel" TEXT NOT NULL,
    "toTierLabel" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "finalRecord" TEXT,
    "finalPPW" DOUBLE PRECISION,
    "finalTierRank" INTEGER,
    "approvedBy" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_movement_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_announcements" (
    "id" TEXT NOT NULL,
    "zombieLeagueId" TEXT NOT NULL,
    "universeId" TEXT,
    "week" INTEGER,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "targetUserId" TEXT,
    "isPosted" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_name_records" (
    "id" TEXT NOT NULL,
    "universeId" TEXT,
    "leagueId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "generatedName" TEXT NOT NULL,
    "finalName" TEXT NOT NULL,
    "wasEdited" BOOLEAN NOT NULL DEFAULT false,
    "namingMode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_name_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_paid_configs" (
    "id" TEXT NOT NULL,
    "zombieLeagueId" TEXT NOT NULL,
    "buyInAmount" DOUBLE PRECISION NOT NULL,
    "commissionerFeeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionerFeeCap" DOUBLE PRECISION,
    "totalPot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weeklyPayoutPool" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weeklyPayoutRate" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "seasonPayoutRate" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "survivorBonusRate" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "ultimateSurvivorPot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ultimateSurvivorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "paidUserIds" TEXT[],
    "totalCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPaidOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "potIsLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zombie_paid_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_rules_templates" (
    "id" TEXT NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "rosterSize" INTEGER NOT NULL DEFAULT 15,
    "starterCount" INTEGER NOT NULL DEFAULT 9,
    "benchCount" INTEGER NOT NULL DEFAULT 6,
    "irSlotsDefault" INTEGER NOT NULL DEFAULT 0,
    "lineupFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "scoringPeriod" TEXT NOT NULL DEFAULT 'weekly',
    "scoringWindowDesc" TEXT NOT NULL DEFAULT '',
    "bashingThreshold" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "maulingThreshold" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "weaponShieldThreshold" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "weaponAmbushThreshold" DOUBLE PRECISION NOT NULL DEFAULT 120,
    "serumAwardCondition" TEXT NOT NULL DEFAULT '',
    "serumAwardDesc" TEXT NOT NULL DEFAULT '',
    "edgeCaseNotes" TEXT NOT NULL DEFAULT '',
    "positionList" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lineupLockDesc" TEXT,
    "reviveThreshold" INTEGER NOT NULL DEFAULT 3,
    "serumMaxHold" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zombie_rules_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_rules_documents" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "sectionOverview" TEXT NOT NULL DEFAULT '',
    "sectionInfection" TEXT NOT NULL DEFAULT '',
    "sectionWhisperer" TEXT NOT NULL DEFAULT '',
    "sectionSurvivor" TEXT NOT NULL DEFAULT '',
    "sectionZombie" TEXT NOT NULL DEFAULT '',
    "sectionScoring" TEXT NOT NULL DEFAULT '',
    "sectionRoster" TEXT NOT NULL DEFAULT '',
    "sectionAmbush" TEXT NOT NULL DEFAULT '',
    "sectionBashing" TEXT NOT NULL DEFAULT '',
    "sectionMauling" TEXT NOT NULL DEFAULT '',
    "sectionSerums" TEXT NOT NULL DEFAULT '',
    "sectionWeapons" TEXT NOT NULL DEFAULT '',
    "sectionWinnings" TEXT NOT NULL DEFAULT '',
    "sectionUniverseMovement" TEXT NOT NULL DEFAULT '',
    "sectionWeeklyTiming" TEXT NOT NULL DEFAULT '',
    "sectionChimmy" TEXT NOT NULL DEFAULT '',
    "sectionPaidVsFree" TEXT NOT NULL DEFAULT '',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zombie_rules_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_audit_entries" (
    "id" TEXT NOT NULL,
    "zombieLeagueId" TEXT NOT NULL,
    "universeId" TEXT,
    "week" INTEGER,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "targetUserId" TEXT,
    "targetStatus" TEXT,
    "previousState" JSONB,
    "newState" JSONB,
    "amount" DOUBLE PRECISION,
    "description" TEXT NOT NULL,
    "isVisibleToCommissioner" BOOLEAN NOT NULL DEFAULT true,
    "isVisibleToAffectedUser" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isRevealablePostSeason" BOOLEAN NOT NULL DEFAULT true,
    "cannotBeOverridden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_free_reward_configs" (
    "id" TEXT NOT NULL,
    "zombieLeagueId" TEXT NOT NULL,
    "currencyLabel" TEXT NOT NULL DEFAULT 'Outbreak Points',
    "weeklyWinLabel" TEXT NOT NULL DEFAULT 'Weekly Horde Haul',
    "seasonWinLabel" TEXT NOT NULL DEFAULT 'Sole Survivor Award',
    "ultimatePotLabel" TEXT NOT NULL DEFAULT 'Last Alive Bonus',
    "badgesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "achievementsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "symbolicPotTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "symbolicWeeklyPool" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_free_reward_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_ambush_actions" (
    "id" TEXT NOT NULL,
    "zombieLeagueId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "whispererUserId" TEXT NOT NULL,
    "ambushType" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetMatchupId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submittedViaChimmy" BOOLEAN NOT NULL DEFAULT true,
    "chatMessageId" TEXT,
    "validationResult" TEXT,
    "validationNotes" TEXT,
    "commissionerNotifiedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "auditLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_ambush_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_bashing_events" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "week" INTEGER NOT NULL,
    "winnerUserId" TEXT NOT NULL,
    "winnerStatus" TEXT NOT NULL,
    "loserUserId" TEXT NOT NULL,
    "loserStatus" TEXT NOT NULL,
    "winnerScore" DOUBLE PRECISION NOT NULL,
    "loserScore" DOUBLE PRECISION NOT NULL,
    "margin" DOUBLE PRECISION NOT NULL,
    "bashingType" TEXT NOT NULL,
    "requiresDecision" BOOLEAN NOT NULL DEFAULT false,
    "decisionDeadline" TIMESTAMP(3),
    "decisionMade" TEXT,
    "decisionMadeAt" TIMESTAMP(3),
    "defaultedToRule" BOOLEAN NOT NULL DEFAULT false,
    "winningsTransferred" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "itemsTransferred" JSONB,
    "serumAwarded" BOOLEAN NOT NULL DEFAULT false,
    "animationTriggered" BOOLEAN NOT NULL DEFAULT false,
    "commissionerNotifiedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_bashing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_mauling_events" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "week" INTEGER NOT NULL,
    "maulerUserId" TEXT NOT NULL,
    "maulerStatus" TEXT NOT NULL,
    "victimUserId" TEXT NOT NULL,
    "victimStatus" TEXT NOT NULL,
    "maulerScore" DOUBLE PRECISION NOT NULL,
    "victimScore" DOUBLE PRECISION NOT NULL,
    "margin" DOUBLE PRECISION NOT NULL,
    "maulingType" TEXT NOT NULL,
    "winningsTransferred" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lootMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "itemsTransferred" JSONB,
    "serumAutoAwarded" BOOLEAN NOT NULL DEFAULT false,
    "newWhispererTriggered" BOOLEAN NOT NULL DEFAULT false,
    "newWhispererUserId" TEXT,
    "animationTriggered" BOOLEAN NOT NULL DEFAULT false,
    "commissionerNotifiedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_mauling_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_chimmy_actions" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "userId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "rawMessage" TEXT NOT NULL,
    "parsedAction" JSONB,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "validationError" TEXT,
    "publicResponse" TEXT,
    "privateResponse" TEXT,
    "effect" JSONB,
    "commissionerNotifiedAt" TIMESTAMP(3),
    "requiresCommissionerApproval" BOOLEAN NOT NULL DEFAULT false,
    "commissionerApprovedAt" TIMESTAMP(3),
    "commissionerApprovedBy" TEXT,
    "auditEntryId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_chimmy_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_commissioner_notifications" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "commissionerId" TEXT NOT NULL,
    "week" INTEGER,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "relatedUserId" TEXT,
    "relatedEventId" TEXT,
    "relatedEventType" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'normal',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "requiresAction" BOOLEAN NOT NULL DEFAULT false,
    "actionDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_commissioner_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_event_animations" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "week" INTEGER NOT NULL,
    "animationType" TEXT NOT NULL,
    "primaryUserId" TEXT NOT NULL,
    "secondaryUserId" TEXT,
    "displayLocation" TEXT NOT NULL DEFAULT 'league_chat_and_home',
    "durationMs" INTEGER NOT NULL DEFAULT 3000,
    "metadata" JSONB,
    "isDelivered" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),
    "reducedMotion" BOOLEAN NOT NULL DEFAULT false,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_event_animations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_league_configs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "universeId" VARCHAR(64),
    "whispererSelection" VARCHAR(32) NOT NULL DEFAULT 'random',
    "infectionLossToWhisperer" BOOLEAN NOT NULL DEFAULT true,
    "infectionLossToZombie" BOOLEAN NOT NULL DEFAULT true,
    "serumReviveCount" INTEGER NOT NULL DEFAULT 2,
    "serumAwardHighScore" BOOLEAN NOT NULL DEFAULT true,
    "serumAwardOnBashMaul" BOOLEAN NOT NULL DEFAULT true,
    "serumUseBeforeLastStarter" BOOLEAN NOT NULL DEFAULT true,
    "weaponScoreThresholds" JSONB,
    "weaponTopTwoActive" BOOLEAN NOT NULL DEFAULT true,
    "bombOneTimeOverride" BOOLEAN NOT NULL DEFAULT false,
    "ambushCountPerWeek" INTEGER NOT NULL DEFAULT 1,
    "ambushRemapMatchup" BOOLEAN NOT NULL DEFAULT true,
    "noWaiverFreeAgency" BOOLEAN NOT NULL DEFAULT true,
    "statCorrectionReversal" BOOLEAN NOT NULL DEFAULT false,
    "zombieTradeBlocked" BOOLEAN NOT NULL DEFAULT true,
    "dangerousDropThreshold" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zombie_league_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "idp_league_configs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "positionMode" VARCHAR(24) NOT NULL DEFAULT 'standard',
    "rosterPreset" VARCHAR(24) NOT NULL DEFAULT 'standard',
    "slotOverrides" JSONB,
    "scoringPreset" VARCHAR(24) NOT NULL DEFAULT 'balanced',
    "scoringOverrides" JSONB,
    "bestBallEnabled" BOOLEAN NOT NULL DEFAULT false,
    "draftType" VARCHAR(16) NOT NULL DEFAULT 'snake',
    "benchSlots" INTEGER NOT NULL DEFAULT 7,
    "irSlots" INTEGER NOT NULL DEFAULT 2,
    "settingsLockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idp_league_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "dynasty_league_configs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "regularSeasonWeeks" INTEGER NOT NULL DEFAULT 14,
    "rookiePickOrderMethod" VARCHAR(32) NOT NULL DEFAULT 'max_pf',
    "useMaxPfForNonPlayoff" BOOLEAN NOT NULL DEFAULT true,
    "rookieDraftRounds" INTEGER NOT NULL DEFAULT 4,
    "rookieDraftType" VARCHAR(16) NOT NULL DEFAULT 'linear',
    "divisionsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tradeDeadlineWeek" INTEGER,
    "waiverTypeRecommended" VARCHAR(24) NOT NULL DEFAULT 'faab',
    "futurePicksYearsOut" INTEGER NOT NULL DEFAULT 3,
    "taxiSlots" INTEGER NOT NULL DEFAULT 4,
    "taxiEligibilityYears" INTEGER NOT NULL DEFAULT 1,
    "taxiLockBehavior" VARCHAR(32) NOT NULL DEFAULT 'once_promoted_no_return',
    "taxiInSeasonMoves" BOOLEAN NOT NULL DEFAULT true,
    "taxiPostseasonMoves" BOOLEAN NOT NULL DEFAULT false,
    "taxiScoringOn" BOOLEAN NOT NULL DEFAULT false,
    "taxiDeadlineWeek" INTEGER,
    "taxiPromotionDeadlineWeek" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dynasty_league_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "dynasty_draft_order_audit_logs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "overridePayload" JSONB NOT NULL,
    "userId" VARCHAR(64) NOT NULL,
    "reason" VARCHAR(256),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dynasty_draft_order_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "idp_player_eligibility" (
    "id" TEXT NOT NULL,
    "sportsPlayerId" VARCHAR(64) NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "positionTags" JSONB NOT NULL,
    "source" VARCHAR(24) NOT NULL DEFAULT 'sleeper',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idp_player_eligibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "idp_best_ball_lineup_snapshots" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "periodKey" VARCHAR(32) NOT NULL,
    "totalPoints" DOUBLE PRECISION,
    "starterIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idp_best_ball_lineup_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "idp_settings_audit_logs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "actorId" VARCHAR(64),
    "action" VARCHAR(48) NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idp_settings_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "idp_cap_configs" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "totalCap" DOUBLE PRECISION NOT NULL DEFAULT 200.0,
    "isHardCap" BOOLEAN NOT NULL DEFAULT true,
    "capFloorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "capFloor" DOUBLE PRECISION,
    "capRolloverEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inSeasonHoldbackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inSeasonHoldbackPct" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "franchiseTagEnabled" BOOLEAN NOT NULL DEFAULT false,
    "franchiseTagValue" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "draftSalaryMethod" TEXT NOT NULL DEFAULT 'auction',
    "snakeScaleHighSalary" DOUBLE PRECISION NOT NULL DEFAULT 30.0,
    "snakeScaleLowSalary" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "snakeScaleCurve" TEXT NOT NULL DEFAULT 'linear',
    "auctionDefaultContractYears" INTEGER NOT NULL DEFAULT 1,
    "snakeTopPickContractYears" INTEGER NOT NULL DEFAULT 3,
    "snakeMidPickContractYears" INTEGER NOT NULL DEFAULT 2,
    "snakeLatePickContractYears" INTEGER NOT NULL DEFAULT 1,
    "isDynastyMode" BOOLEAN NOT NULL DEFAULT false,
    "contractsCarryOver" BOOLEAN NOT NULL DEFAULT false,
    "season" INTEGER NOT NULL DEFAULT 2025,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idp_cap_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "idp_salary_records" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "isDefensive" BOOLEAN NOT NULL DEFAULT false,
    "salary" DOUBLE PRECISION NOT NULL,
    "contractYears" INTEGER NOT NULL DEFAULT 1,
    "yearsRemaining" INTEGER NOT NULL DEFAULT 1,
    "contractStartYear" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "acquisitionMethod" TEXT NOT NULL,
    "isFranchiseTagged" BOOLEAN NOT NULL DEFAULT false,
    "hasBeenExtended" BOOLEAN NOT NULL DEFAULT false,
    "extensionBoostPct" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "cutPenaltyCurrent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idp_salary_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "idp_dead_money" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "salaryRecordId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "currentYearDead" DOUBLE PRECISION NOT NULL,
    "futureYearsDead" DOUBLE PRECISION NOT NULL,
    "totalDeadMoney" DOUBLE PRECISION NOT NULL,
    "yearsRemainingAtCut" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idp_dead_money_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "idp_cap_projections" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "projectionYear" INTEGER NOT NULL,
    "committedSalary" DOUBLE PRECISION NOT NULL,
    "deadCapHits" DOUBLE PRECISION NOT NULL,
    "totalCapUsed" DOUBLE PRECISION NOT NULL,
    "availableCap" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idp_cap_projections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "idp_cap_transactions" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "isDefensive" BOOLEAN NOT NULL DEFAULT false,
    "transactionType" TEXT NOT NULL,
    "salary" DOUBLE PRECISION NOT NULL,
    "contractYears" INTEGER,
    "deadMoneyCreated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capImpact" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "season" INTEGER NOT NULL,
    "week" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idp_cap_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "devy_league_configs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "dynastyOnly" BOOLEAN NOT NULL DEFAULT true,
    "supportsStartupVetDraft" BOOLEAN NOT NULL DEFAULT true,
    "supportsRookieDraft" BOOLEAN NOT NULL DEFAULT true,
    "supportsDevyDraft" BOOLEAN NOT NULL DEFAULT true,
    "supportsBestBall" BOOLEAN NOT NULL DEFAULT true,
    "supportsSnakeDraft" BOOLEAN NOT NULL DEFAULT true,
    "supportsLinearDraft" BOOLEAN NOT NULL DEFAULT true,
    "supportsTaxi" BOOLEAN NOT NULL DEFAULT true,
    "supportsFuturePicks" BOOLEAN NOT NULL DEFAULT true,
    "supportsTradeableDevyPicks" BOOLEAN NOT NULL DEFAULT true,
    "supportsTradeableRookiePicks" BOOLEAN NOT NULL DEFAULT true,
    "devySlotCount" INTEGER NOT NULL DEFAULT 6,
    "devyIRSlots" INTEGER NOT NULL DEFAULT 0,
    "taxiSize" INTEGER NOT NULL DEFAULT 6,
    "devyScoringEnabled" BOOLEAN NOT NULL DEFAULT false,
    "collegeSports" JSONB,
    "rookieDraftRounds" INTEGER NOT NULL DEFAULT 4,
    "devyDraftRounds" INTEGER NOT NULL DEFAULT 4,
    "startupVetRounds" INTEGER,
    "bestBallEnabled" BOOLEAN NOT NULL DEFAULT false,
    "startupDraftType" VARCHAR(16) NOT NULL DEFAULT 'snake',
    "rookieDraftType" VARCHAR(16) NOT NULL DEFAULT 'snake',
    "devyDraftType" VARCHAR(16) NOT NULL DEFAULT 'snake',
    "maxYearlyDevyPromotions" INTEGER,
    "earlyDeclareBehavior" VARCHAR(24) NOT NULL DEFAULT 'allow',
    "rookiePickOrderMethod" VARCHAR(32) NOT NULL DEFAULT 'reverse_standings',
    "devyPickOrderMethod" VARCHAR(32) NOT NULL DEFAULT 'reverse_standings',
    "devyPickTradeRules" VARCHAR(24) NOT NULL DEFAULT 'allowed',
    "rookiePickTradeRules" VARCHAR(24) NOT NULL DEFAULT 'allowed',
    "nflDevyExcludeKDST" BOOLEAN NOT NULL DEFAULT false,
    "promotionTiming" VARCHAR(48) NOT NULL DEFAULT 'manager_choice_before_rookie_draft',
    "supplementalDevyFAEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rightsExpirationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "returnToSchoolHandling" VARCHAR(32) NOT NULL DEFAULT 'restore_rights',
    "taxiProRookiesScoreInBestBall" BOOLEAN NOT NULL DEFAULT false,
    "bestBallSuperflex" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devy_league_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "devy_leagues" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "isDynastyOnly" BOOLEAN NOT NULL DEFAULT true,
    "createdByTheCiege" BOOLEAN NOT NULL DEFAULT true,
    "startupDraftFormat" TEXT NOT NULL DEFAULT 'combined',
    "futureDraftFormat" TEXT NOT NULL DEFAULT 'combined',
    "activeRosterSize" INTEGER NOT NULL DEFAULT 20,
    "benchSlots" INTEGER NOT NULL DEFAULT 6,
    "irSlots" INTEGER NOT NULL DEFAULT 2,
    "taxiSlots" INTEGER NOT NULL DEFAULT 5,
    "devySlots" INTEGER NOT NULL DEFAULT 10,
    "maxDevyPerTeam" INTEGER NOT NULL DEFAULT 10,
    "taxiRookieOnly" BOOLEAN NOT NULL DEFAULT true,
    "taxiAllowNonRookies" BOOLEAN NOT NULL DEFAULT false,
    "taxiMaxExperienceYears" INTEGER NOT NULL DEFAULT 1,
    "taxiLockDeadline" TIMESTAMP(3),
    "taxiCanReturnAfterPromo" BOOLEAN NOT NULL DEFAULT false,
    "taxiAutoQualifyRookies" BOOLEAN NOT NULL DEFAULT true,
    "taxiDevyToRookieEligible" BOOLEAN NOT NULL DEFAULT true,
    "taxiPointsVisibleDisplay" BOOLEAN NOT NULL DEFAULT true,
    "taxiPointsCountToward" BOOLEAN NOT NULL DEFAULT false,
    "taxiPoachaingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "devyFreshmenEligible" BOOLEAN NOT NULL DEFAULT false,
    "devyAutoPromoteToRookie" BOOLEAN NOT NULL DEFAULT true,
    "devyDeclarationVisibility" BOOLEAN NOT NULL DEFAULT true,
    "rookiePickTradingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "devyPickTradingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "devyGradBehavior" TEXT NOT NULL DEFAULT 'move_to_taxi',
    "season" INTEGER NOT NULL DEFAULT 2025,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devy_leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "devy_player_states" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "playerType" TEXT NOT NULL,
    "bucketState" TEXT NOT NULL DEFAULT 'active_bench',
    "scoringEligibility" TEXT NOT NULL DEFAULT 'display_only',
    "school" TEXT,
    "classYear" TEXT,
    "projectedDeclarationYear" INTEGER,
    "isDevyEligible" BOOLEAN NOT NULL DEFAULT false,
    "isRookieEligible" BOOLEAN NOT NULL DEFAULT false,
    "nflDraftYear" INTEGER,
    "nflDraftRound" INTEGER,
    "nflDraftPick" INTEGER,
    "isTaxiEligible" BOOLEAN NOT NULL DEFAULT false,
    "taxiYearsUsed" INTEGER NOT NULL DEFAULT 0,
    "transitionedFrom" TEXT,
    "transitionedAt" TIMESTAMP(3),
    "transitionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devy_player_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "devy_taxi_slots" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "taxiYearStart" INTEGER NOT NULL,
    "taxiYearsCurrent" INTEGER NOT NULL DEFAULT 1,
    "isEligible" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promotedAt" TIMESTAMP(3),
    "promotedToState" TEXT,

    CONSTRAINT "devy_taxi_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "devy_devy_slots" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "school" TEXT,
    "schoolLogoUrl" TEXT,
    "classYear" TEXT,
    "projectedDeclarationYear" INTEGER,
    "hasEnteredNFL" BOOLEAN NOT NULL DEFAULT false,
    "nflEntryYear" INTEGER,
    "nflEntryStatus" TEXT,
    "rightsAcquiredVia" TEXT,
    "rightsAcquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transitionedAt" TIMESTAMP(3),
    "transitionQueue" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "devy_devy_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "devy_rookie_transitions" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "school" TEXT,
    "nflEntryYear" INTEGER NOT NULL,
    "nflEntryMethod" TEXT NOT NULL,
    "previousState" TEXT NOT NULL DEFAULT 'devy',
    "destinationState" TEXT NOT NULL,
    "wasAutoTransitioned" BOOLEAN NOT NULL DEFAULT false,
    "wasCommissionerReview" BOOLEAN NOT NULL DEFAULT false,
    "commissionerApprovedAt" TIMESTAMP(3),
    "transitionedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "devy_rookie_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "devy_draft_picks" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "pickType" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "originalOwnerId" TEXT NOT NULL,
    "currentOwnerId" TEXT NOT NULL,
    "isTradeable" BOOLEAN NOT NULL DEFAULT true,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedOnPlayerId" TEXT,
    "usedAt" TIMESTAMP(3),
    "tradeHistory" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devy_draft_picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "devy_import_sessions" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "commissionerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "summary" JSONB,
    "approvedAt" TIMESTAMP(3),
    "mergedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devy_import_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "devy_import_sources" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourcePlatform" TEXT,
    "classification" TEXT,
    "connectionStatus" TEXT NOT NULL DEFAULT 'pending',
    "rawData" JSONB,
    "importedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devy_import_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "devy_player_mappings" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalName" TEXT NOT NULL,
    "externalPlatform" TEXT NOT NULL,
    "externalPosition" TEXT,
    "externalTeam" TEXT,
    "externalSchool" TEXT,
    "internalPlayerId" TEXT,
    "internalPlayerName" TEXT,
    "matchConfidence" TEXT NOT NULL DEFAULT 'unmatched',
    "matchMethod" TEXT,
    "isConfirmedByCommissioner" BOOLEAN NOT NULL DEFAULT false,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "playerType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devy_player_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "devy_manager_mappings" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "externalUsername" TEXT NOT NULL,
    "externalDisplayName" TEXT NOT NULL,
    "externalPlatform" TEXT NOT NULL,
    "internalUserId" TEXT,
    "internalUsername" TEXT,
    "matchConfidence" TEXT NOT NULL DEFAULT 'unmatched',
    "isConfirmedByCommissioner" BOOLEAN NOT NULL DEFAULT false,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devy_manager_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "devy_merge_conflicts" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "conflictType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affectedEntities" JSONB NOT NULL,
    "resolution" TEXT NOT NULL DEFAULT 'pending',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "commissionerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devy_merge_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "devy_imported_seasons" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "sourcePlatform" TEXT,
    "standings" JSONB,
    "scoringRecords" JSONB,
    "titleWinner" TEXT,
    "notes" TEXT,
    "importConfidence" TEXT NOT NULL DEFAULT 'high',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devy_imported_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "devy_rights" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "devyPlayerId" VARCHAR(64) NOT NULL,
    "slotCategory" VARCHAR(16) NOT NULL DEFAULT 'DEVY',
    "c2cLineupRole" VARCHAR(16),
    "state" VARCHAR(32) NOT NULL,
    "seasonYear" INTEGER,
    "promotedProPlayerId" VARCHAR(64),
    "promotedAt" TIMESTAMP(3),
    "managerPromotedAt" TIMESTAMP(3),
    "returnedToSchoolAt" TIMESTAMP(3),
    "sourceConfidence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devy_rights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "devy_lifecycle_events" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "eventType" VARCHAR(48) NOT NULL,
    "rosterId" VARCHAR(64),
    "devyPlayerId" VARCHAR(64),
    "proPlayerId" VARCHAR(64),
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devy_lifecycle_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "devy_commissioner_overrides" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "devyPlayerId" VARCHAR(64) NOT NULL,
    "proPlayerId" VARCHAR(64),
    "action" VARCHAR(32) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'pending',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" VARCHAR(64),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devy_commissioner_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "devy_draft_histories" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "draftKind" VARCHAR(24) NOT NULL,
    "seasonYear" INTEGER,
    "round" INTEGER NOT NULL,
    "pick" INTEGER NOT NULL,
    "rosterId" VARCHAR(64),
    "playerId" VARCHAR(64),
    "isDevy" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devy_draft_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "devy_class_strength_snapshots" (
    "id" TEXT NOT NULL,
    "sport" VARCHAR(8) NOT NULL,
    "seasonYear" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devy_class_strength_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "devy_best_ball_lineup_snapshots" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "periodKey" VARCHAR(32) NOT NULL,
    "totalPoints" DOUBLE PRECISION,
    "starterIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devy_best_ball_lineup_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "c2c_league_configs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "dynastyOnly" BOOLEAN NOT NULL DEFAULT true,
    "supportsMergedCollegeAndProAssets" BOOLEAN NOT NULL DEFAULT true,
    "supportsCollegeScoring" BOOLEAN NOT NULL DEFAULT true,
    "supportsBestBall" BOOLEAN NOT NULL DEFAULT true,
    "supportsSnakeDraft" BOOLEAN NOT NULL DEFAULT true,
    "supportsLinearDraft" BOOLEAN NOT NULL DEFAULT true,
    "supportsTaxi" BOOLEAN NOT NULL DEFAULT true,
    "supportsFuturePicks" BOOLEAN NOT NULL DEFAULT true,
    "supportsTradeableCollegeAssets" BOOLEAN NOT NULL DEFAULT true,
    "supportsTradeableCollegePicks" BOOLEAN NOT NULL DEFAULT true,
    "supportsTradeableRookiePicks" BOOLEAN NOT NULL DEFAULT true,
    "supportsPromotionRules" BOOLEAN NOT NULL DEFAULT true,
    "startupFormat" VARCHAR(24) NOT NULL DEFAULT 'merged',
    "mergedStartupDraft" BOOLEAN NOT NULL DEFAULT true,
    "separateStartupCollegeDraft" BOOLEAN NOT NULL DEFAULT false,
    "collegeRosterSize" INTEGER NOT NULL DEFAULT 20,
    "collegeSports" JSONB,
    "collegeScoringSystem" VARCHAR(24) NOT NULL DEFAULT 'ppr',
    "mixProPlayers" BOOLEAN NOT NULL DEFAULT true,
    "collegeActiveLineupSlots" JSONB,
    "taxiSize" INTEGER NOT NULL DEFAULT 6,
    "rookieDraftRounds" INTEGER NOT NULL DEFAULT 4,
    "collegeDraftRounds" INTEGER NOT NULL DEFAULT 6,
    "bestBallPro" BOOLEAN NOT NULL DEFAULT true,
    "bestBallCollege" BOOLEAN NOT NULL DEFAULT false,
    "promotionTiming" VARCHAR(48) NOT NULL DEFAULT 'manager_choice_before_rookie_draft',
    "maxPromotionsPerYear" INTEGER,
    "earlyDeclareBehavior" VARCHAR(24) NOT NULL DEFAULT 'allow',
    "returnToSchoolHandling" VARCHAR(32) NOT NULL DEFAULT 'restore_rights',
    "rookiePickTradeRules" VARCHAR(24) NOT NULL DEFAULT 'allowed',
    "collegePickTradeRules" VARCHAR(24) NOT NULL DEFAULT 'allowed',
    "collegeScoringUntilDeadline" BOOLEAN NOT NULL DEFAULT true,
    "standingsModel" VARCHAR(24) NOT NULL DEFAULT 'unified',
    "mergedRookieCollegeDraft" BOOLEAN NOT NULL DEFAULT false,
    "nflCollegeExcludeKDST" BOOLEAN NOT NULL DEFAULT true,
    "proLineupSlots" JSONB,
    "proBenchSize" INTEGER NOT NULL DEFAULT 12,
    "proIRSize" INTEGER NOT NULL DEFAULT 3,
    "startupDraftType" VARCHAR(16) NOT NULL DEFAULT 'snake',
    "rookieDraftType" VARCHAR(16) NOT NULL DEFAULT 'snake',
    "collegeDraftType" VARCHAR(16) NOT NULL DEFAULT 'snake',
    "rookiePickOrderMethod" VARCHAR(32) NOT NULL DEFAULT 'reverse_standings',
    "collegePickOrderMethod" VARCHAR(32) NOT NULL DEFAULT 'reverse_standings',
    "hybridProWeight" INTEGER NOT NULL DEFAULT 60,
    "hybridPlayoffQualification" VARCHAR(32) NOT NULL DEFAULT 'weighted',
    "hybridChampionshipTieBreaker" VARCHAR(32) NOT NULL DEFAULT 'total_points',
    "collegeFAEnabled" BOOLEAN NOT NULL DEFAULT false,
    "collegeFAABSeparate" BOOLEAN NOT NULL DEFAULT false,
    "collegeFAABBudget" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "c2c_league_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "c2c_scoring_logs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "devyPlayerId" VARCHAR(64) NOT NULL,
    "gameId" VARCHAR(64) NOT NULL DEFAULT 'season',
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "scoringSystem" VARCHAR(24) NOT NULL DEFAULT 'ppr',
    "breakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "c2c_scoring_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "c2c_leagues" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "isDynastyOnly" BOOLEAN NOT NULL DEFAULT true,
    "createdByTheCiege" BOOLEAN NOT NULL DEFAULT true,
    "sportPair" TEXT NOT NULL DEFAULT 'NFL_CFB',
    "scoringMode" TEXT NOT NULL DEFAULT 'combined_total',
    "campusScoreWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "cantonScoreWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "campusStarterSlots" INTEGER NOT NULL DEFAULT 8,
    "cantonStarterSlots" INTEGER NOT NULL DEFAULT 8,
    "benchSlots" INTEGER NOT NULL DEFAULT 8,
    "taxiSlots" INTEGER NOT NULL DEFAULT 4,
    "devySlots" INTEGER NOT NULL DEFAULT 6,
    "irSlots" INTEGER NOT NULL DEFAULT 2,
    "taxiRookieOnly" BOOLEAN NOT NULL DEFAULT true,
    "taxiMaxExperienceYears" INTEGER NOT NULL DEFAULT 1,
    "taxiLockDeadline" TIMESTAMP(3),
    "taxiPointsVisible" BOOLEAN NOT NULL DEFAULT true,
    "devyScoringEnabled" BOOLEAN NOT NULL DEFAULT false,
    "startupDraftFormat" TEXT NOT NULL DEFAULT 'split_campus_canton',
    "futureDraftFormat" TEXT NOT NULL DEFAULT 'combined',
    "footballCampusLockDay" TEXT NOT NULL DEFAULT 'saturday_kickoff',
    "footballCantonLockDay" TEXT NOT NULL DEFAULT 'sunday_kickoff_per_player',
    "basketballLineupFreq" TEXT NOT NULL DEFAULT 'weekly',
    "season" INTEGER NOT NULL DEFAULT 2025,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "c2c_leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "c2c_player_states" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "sport" TEXT NOT NULL DEFAULT 'NFL',
    "playerSide" TEXT NOT NULL,
    "playerType" TEXT NOT NULL DEFAULT 'active',
    "bucketState" TEXT NOT NULL DEFAULT 'bench',
    "scoringEligibility" TEXT NOT NULL,
    "school" TEXT,
    "schoolLogoUrl" TEXT,
    "classYear" TEXT,
    "projectedDeclarationYear" INTEGER,
    "hasEnteredPro" BOOLEAN NOT NULL DEFAULT false,
    "proEntryYear" INTEGER,
    "proEntryMethod" TEXT,
    "nflNbaTeam" TEXT,
    "isRookieEligible" BOOLEAN NOT NULL DEFAULT false,
    "isTaxiEligible" BOOLEAN NOT NULL DEFAULT false,
    "taxiYearsUsed" INTEGER NOT NULL DEFAULT 0,
    "transitionedFrom" TEXT,
    "transitionedAt" TIMESTAMP(3),
    "transitionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "c2c_player_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "c2c_matchup_scores" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "matchupId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "campusStarterScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cantonStarterScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "benchDisplayScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxiDisplayScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "devyDisplayScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "officialTeamScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "campusMatchupResult" TEXT,
    "cantonMatchupResult" TEXT,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "c2c_matchup_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "c2c_draft_picks" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "pickSide" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "originalOwnerId" TEXT NOT NULL,
    "currentOwnerId" TEXT NOT NULL,
    "isTradeable" BOOLEAN NOT NULL DEFAULT true,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedOnPlayerId" TEXT,
    "usedAt" TIMESTAMP(3),
    "tradeHistory" JSONB,

    CONSTRAINT "c2c_draft_picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "c2c_transition_records" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "fromState" TEXT NOT NULL,
    "toState" TEXT NOT NULL,
    "proEntryYear" INTEGER NOT NULL,
    "proEntryMethod" TEXT NOT NULL,
    "destinationBucket" TEXT NOT NULL,
    "wasAutoTransitioned" BOOLEAN NOT NULL DEFAULT false,
    "commissionerApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "transitionedAt" TIMESTAMP(3),

    CONSTRAINT "c2c_transition_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_league_teams" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "zombieLeagueId" TEXT,
    "rosterId" VARCHAR(64) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'Survivor',
    "weekBecameZombie" INTEGER,
    "killedByRosterId" VARCHAR(64),
    "revivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "fantasyTeamName" TEXT,
    "statusHistory" JSONB,
    "killedByUserId" TEXT,
    "killedAtWeek" INTEGER,
    "infectionCount" INTEGER NOT NULL DEFAULT 0,
    "isWhisperer" BOOLEAN NOT NULL DEFAULT false,
    "ambushesRemaining" INTEGER NOT NULL DEFAULT 0,
    "ambushesUsed" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsAgainst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weeklyWinnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWinnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isVeteran" BOOLEAN NOT NULL DEFAULT false,
    "yearsInLeague" INTEGER NOT NULL DEFAULT 1,
    "universeTierId" TEXT,
    "redraftRosterId" TEXT,
    "zombieAttacksSurvived" INTEGER NOT NULL DEFAULT 0,
    "survivorWinStreak" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "zombie_league_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_team_items" (
    "id" TEXT NOT NULL,
    "teamStatusId" TEXT NOT NULL,
    "zombieLeagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemLabel" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acquiredReason" TEXT,
    "usedAtWeek" INTEGER,
    "usedOnUserId" TEXT,
    "usedEffect" TEXT,
    "activationState" TEXT NOT NULL DEFAULT 'ready',
    "activatesAtWeek" INTEGER,

    CONSTRAINT "zombie_team_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_infection_logs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "zombieLeagueId" TEXT,
    "week" INTEGER NOT NULL,
    "survivorRosterId" VARCHAR(64) NOT NULL,
    "infectedByRosterId" VARCHAR(64) NOT NULL,
    "matchupId" VARCHAR(64),
    "reversedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_infection_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_resource_ledgers" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "zombieLeagueId" TEXT,
    "rosterId" VARCHAR(64) NOT NULL,
    "resourceType" VARCHAR(32) NOT NULL,
    "resourceKey" VARCHAR(64),
    "balance" INTEGER NOT NULL DEFAULT 0,
    "awardedInWeek" INTEGER,
    "spentAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zombie_resource_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_resource_ledger_entries" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "resourceType" VARCHAR(32) NOT NULL,
    "resourceKey" VARCHAR(64),
    "delta" INTEGER NOT NULL,
    "reason" VARCHAR(64) NOT NULL,
    "week" INTEGER,
    "targetRosterId" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_resource_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_weekly_winnings" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "zombieLeagueId" TEXT,
    "rosterId" VARCHAR(64) NOT NULL,
    "week" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_weekly_winnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_movement_projections" (
    "id" TEXT NOT NULL,
    "universeId" VARCHAR(64) NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "currentLevelId" VARCHAR(64),
    "projectedLevelId" VARCHAR(64),
    "reason" VARCHAR(64),
    "season" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zombie_movement_projections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_ambush_events" (
    "id" TEXT NOT NULL,
    "zombieLeagueId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "whispererRosterId" VARCHAR(64) NOT NULL,
    "fromMatchupId" VARCHAR(64),
    "toMatchupId" VARCHAR(64),
    "targetRosterId" VARCHAR(64),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_ambush_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "zombie_audit_logs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "universeId" VARCHAR(64),
    "zombieLeagueId" TEXT,
    "eventType" VARCHAR(64) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "roster_templates" (
    "id" TEXT NOT NULL,
    "sport_type" VARCHAR(12) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "formatType" VARCHAR(32) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roster_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "roster_template_slots" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "slotName" VARCHAR(32) NOT NULL,
    "allowedPositions" JSONB NOT NULL,
    "starterCount" INTEGER NOT NULL DEFAULT 0,
    "benchCount" INTEGER NOT NULL DEFAULT 0,
    "reserveCount" INTEGER NOT NULL DEFAULT 0,
    "taxiCount" INTEGER NOT NULL DEFAULT 0,
    "devyCount" INTEGER NOT NULL DEFAULT 0,
    "isFlexibleSlot" BOOLEAN NOT NULL DEFAULT false,
    "slotOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "roster_template_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "league_roster_configs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "templateId" TEXT NOT NULL,
    "overrides" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_roster_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "scoring_templates" (
    "id" TEXT NOT NULL,
    "sport_type" VARCHAR(12) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "formatType" VARCHAR(32) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scoring_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "scoring_rules" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "statKey" VARCHAR(48) NOT NULL,
    "pointsValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "scoring_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "league_scoring_overrides" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "statKey" VARCHAR(48) NOT NULL,
    "pointsValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "league_scoring_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sport_feature_flags" (
    "id" TEXT NOT NULL,
    "sport_type" VARCHAR(12) NOT NULL,
    "supportsBestBall" BOOLEAN NOT NULL DEFAULT false,
    "supportsSuperflex" BOOLEAN NOT NULL DEFAULT false,
    "supportsTePremium" BOOLEAN NOT NULL DEFAULT false,
    "supportsKickers" BOOLEAN NOT NULL DEFAULT false,
    "supportsTeamDefense" BOOLEAN NOT NULL DEFAULT false,
    "supportsIdp" BOOLEAN NOT NULL DEFAULT false,
    "supportsWeeklyLineups" BOOLEAN NOT NULL DEFAULT true,
    "supportsDailyLineups" BOOLEAN NOT NULL DEFAULT false,
    "supportsBracketMode" BOOLEAN NOT NULL DEFAULT false,
    "supportsDevy" BOOLEAN NOT NULL DEFAULT false,
    "supportsTaxi" BOOLEAN NOT NULL DEFAULT false,
    "supportsIr" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sport_feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "schedule_templates" (
    "id" TEXT NOT NULL,
    "sport_type" VARCHAR(12) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "formatType" VARCHAR(32) NOT NULL,
    "matchupType" VARCHAR(48) NOT NULL,
    "regularSeasonWeeks" INTEGER NOT NULL DEFAULT 14,
    "playoffWeeks" INTEGER NOT NULL DEFAULT 3,
    "byeWeekWindow" JSONB,
    "fantasyPlayoffDefault" JSONB,
    "lineupLockMode" VARCHAR(32),
    "scoringMode" VARCHAR(48),
    "regularSeasonStyle" VARCHAR(48),
    "playoffSupport" BOOLEAN NOT NULL DEFAULT true,
    "bracketModeSupported" BOOLEAN NOT NULL DEFAULT false,
    "marchMadnessMode" BOOLEAN NOT NULL DEFAULT false,
    "bowlPlayoffMetadata" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "season_calendars" (
    "id" TEXT NOT NULL,
    "sport_type" VARCHAR(12) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "formatType" VARCHAR(32) NOT NULL,
    "preseasonPeriod" JSONB,
    "regularSeasonPeriod" JSONB NOT NULL,
    "playoffsPeriod" JSONB,
    "championshipPeriod" JSONB,
    "internationalBreaksSupported" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "season_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "game_schedules" (
    "id" TEXT NOT NULL,
    "sport_type" VARCHAR(12) NOT NULL,
    "season" INTEGER NOT NULL,
    "weekOrRound" INTEGER NOT NULL,
    "externalId" VARCHAR(64) NOT NULL,
    "homeTeamId" VARCHAR(32),
    "awayTeamId" VARCHAR(32),
    "homeTeam" VARCHAR(16),
    "awayTeam" VARCHAR(16),
    "startTime" TIMESTAMP(3),
    "venue" VARCHAR(128),
    "weather" JSONB,
    "home_score" INTEGER,
    "away_score" INTEGER,
    "status" VARCHAR(24) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "player_game_stats" (
    "id" TEXT NOT NULL,
    "playerId" VARCHAR(64) NOT NULL,
    "sport_type" VARCHAR(12) NOT NULL,
    "gameId" VARCHAR(64) NOT NULL,
    "season" INTEGER NOT NULL,
    "weekOrRound" INTEGER NOT NULL,
    "stat_payload" JSONB NOT NULL,
    "normalized_stat_map" JSONB NOT NULL,
    "fantasyPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_game_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "team_game_stats" (
    "id" TEXT NOT NULL,
    "sport_type" VARCHAR(12) NOT NULL,
    "gameId" VARCHAR(64) NOT NULL,
    "teamId" VARCHAR(32) NOT NULL,
    "season" INTEGER NOT NULL,
    "weekOrRound" INTEGER NOT NULL,
    "stat_payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_game_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "stat_ingestion_jobs" (
    "id" TEXT NOT NULL,
    "sport_type" VARCHAR(12) NOT NULL,
    "season" INTEGER NOT NULL,
    "weekOrRound" INTEGER,
    "source" VARCHAR(32) NOT NULL,
    "status" VARCHAR(24) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "gameCount" INTEGER NOT NULL DEFAULT 0,
    "statCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" VARCHAR(512),

    CONSTRAINT "stat_ingestion_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "player_meta_trends" (
    "id" TEXT NOT NULL,
    "playerId" VARCHAR(32) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "trendScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "addRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dropRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tradeInterest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "draftFrequency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineupStartRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "injuryImpact" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trendingDirection" VARCHAR(16) NOT NULL,
    "previousTrendScore" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_meta_trends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "trend_signal_events" (
    "id" TEXT NOT NULL,
    "playerId" VARCHAR(32) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "signalType" VARCHAR(24) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "leagueId" VARCHAR(64),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trend_signal_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "strategy_meta_reports" (
    "id" TEXT NOT NULL,
    "strategyType" VARCHAR(32) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "usageRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trendingDirection" VARCHAR(16) NOT NULL,
    "leagueFormat" VARCHAR(32) NOT NULL,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategy_meta_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "strategy_meta_snapshots" (
    "id" TEXT NOT NULL,
    "strategyType" VARCHAR(32) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "usageRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trendingDirection" VARCHAR(16) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_meta_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "global_meta_snapshots" (
    "id" TEXT NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "season" VARCHAR(8) NOT NULL,
    "weekOrPeriod" INTEGER NOT NULL DEFAULT 0,
    "metaType" VARCHAR(24) NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "global_meta_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "position_meta_trends" (
    "id" TEXT NOT NULL,
    "position" VARCHAR(16) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "usageRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "draftRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rosterRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trendingDirection" VARCHAR(16) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "position_meta_trends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "waiver_claims" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "sport_type" VARCHAR(16),
    "rosterId" TEXT NOT NULL,
    "addPlayerId" TEXT NOT NULL,
    "dropPlayerId" TEXT,
    "faabBid" INTEGER,
    "priorityOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processedAt" TIMESTAMP(3),
    "resultMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waiver_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "waiver_transactions" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "sport_type" VARCHAR(16),
    "rosterId" TEXT NOT NULL,
    "claimId" TEXT,
    "addPlayerId" TEXT NOT NULL,
    "dropPlayerId" TEXT,
    "faabSpent" INTEGER,
    "waiverPriorityBefore" INTEGER,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waiver_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "waiver_pickups" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "outcome" TEXT,
    "week" INTEGER,
    "year" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waiver_pickups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sleeper_leagues" (
    "id" TEXT NOT NULL,
    "sleeperLeagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalTeams" INTEGER NOT NULL,
    "season" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "isDynasty" BOOLEAN NOT NULL,
    "scoringType" TEXT NOT NULL,
    "rosterSettings" JSONB NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT,
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sleeper_leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sleeper_rosters" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "players" JSONB NOT NULL,
    "starters" JSONB NOT NULL,
    "bench" JSONB NOT NULL,
    "faabRemaining" INTEGER,
    "waiverPriority" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sleeper_rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RookieRanking" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "team" TEXT,
    "rank" INTEGER NOT NULL,
    "dynastyValue" INTEGER,
    "college" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RookieRanking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "mock_drafts" (
    "id" TEXT NOT NULL,
    "shareId" TEXT,
    "inviteToken" TEXT,
    "leagueId" TEXT,
    "userId" TEXT NOT NULL,
    "rounds" INTEGER NOT NULL DEFAULT 15,
    "results" JSONB NOT NULL DEFAULT '[]',
    "proposals" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pre_draft',
    "metadata" JSONB,
    "slotConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "mock_draft_chats" (
    "id" TEXT NOT NULL,
    "mockDraftId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mock_draft_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "draft_sessions" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "sport_type" VARCHAR(16),
    "sleeperDraftId" TEXT,
    "sessionKind" TEXT NOT NULL DEFAULT 'live',
    "nextOverallPick" INTEGER NOT NULL DEFAULT 1,
    "currentRoundNum" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pre_draft',
    "draftType" TEXT NOT NULL DEFAULT 'snake',
    "rounds" INTEGER NOT NULL DEFAULT 15,
    "teamCount" INTEGER NOT NULL DEFAULT 12,
    "thirdRoundReversal" BOOLEAN NOT NULL DEFAULT false,
    "timerSeconds" INTEGER,
    "timerEndAt" TIMESTAMP(3),
    "pausedRemainingSeconds" INTEGER,
    "slotOrder" JSONB NOT NULL DEFAULT '[]',
    "tradedPicks" JSONB DEFAULT '[]',
    "auctionBudgetPerTeam" INTEGER,
    "auctionBudgets" JSONB,
    "auctionState" JSONB,
    "keeperConfig" JSONB,
    "keeperSelections" JSONB,
    "devyConfig" JSONB,
    "c2cConfig" JSONB,
    "aiAutoPick" BOOLEAN NOT NULL DEFAULT false,
    "cpuAutoPick" BOOLEAN NOT NULL DEFAULT true,
    "playerPool" TEXT NOT NULL DEFAULT 'all',
    "alphabeticalSort" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "draft_picks" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sport_type" VARCHAR(16),
    "overall" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,
    "rosterId" TEXT NOT NULL,
    "displayName" TEXT,
    "playerName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "team" TEXT,
    "byeWeek" INTEGER,
    "playerId" TEXT,
    "roundPick" INTEGER,
    "ownerUserId" TEXT,
    "playerImageUrl" TEXT,
    "pickedAt" TIMESTAMP(3),
    "tradedPickMeta" JSONB,
    "source" TEXT DEFAULT 'user',
    "amount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "draft_pick_trade_proposals" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "proposerRosterId" TEXT NOT NULL,
    "receiverRosterId" TEXT NOT NULL,
    "giveRound" INTEGER NOT NULL,
    "giveSlot" INTEGER NOT NULL,
    "giveOriginalRosterId" TEXT NOT NULL,
    "receiveRound" INTEGER NOT NULL,
    "receiveSlot" INTEGER NOT NULL,
    "receiveOriginalRosterId" TEXT NOT NULL,
    "proposerName" TEXT,
    "receiverName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "respondedAt" TIMESTAMP(3),
    "responsePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_pick_trade_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_manager_audit_log" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "reason" TEXT,
    "triggeredBy" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_manager_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "draft_queues" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "order" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "draft_queue_entries" (
    "id" TEXT NOT NULL,
    "draftSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_queue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "draft_chat_messages" (
    "id" TEXT NOT NULL,
    "draftSessionId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorAvatar" TEXT,
    "text" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'message',
    "metadata" JSONB,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "draft_import_backups" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_import_backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "rankings_backtest_results" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" VARCHAR(8) NOT NULL,
    "weekEvaluated" INTEGER NOT NULL,
    "targetType" VARCHAR(32) NOT NULL,
    "horizonWeeks" INTEGER NOT NULL DEFAULT 3,
    "segmentKey" VARCHAR(32) NOT NULL,
    "nTeams" INTEGER NOT NULL,
    "brier" DOUBLE PRECISION NOT NULL,
    "ece" DOUBLE PRECISION NOT NULL,
    "ndcg" DOUBLE PRECISION NOT NULL,
    "spearman" DOUBLE PRECISION NOT NULL,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rankings_backtest_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "draft_prediction_snapshots" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "sport_type" VARCHAR(16),
    "userId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "draftId" TEXT,
    "rounds" INTEGER NOT NULL DEFAULT 2,
    "simulations" INTEGER NOT NULL DEFAULT 250,
    "scenarios" JSONB NOT NULL DEFAULT '[]',
    "snapshotJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_prediction_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "draft_retrospectives" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "sport_type" VARCHAR(16),
    "userId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "draftId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "actualDraftJson" JSONB NOT NULL,
    "managerAccuracyJson" JSONB NOT NULL,
    "biggestMissesJson" JSONB NOT NULL,
    "calibrationDeltaJson" JSONB NOT NULL DEFAULT '{}',
    "overallAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "top3HitRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_retrospectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "league_draft_calibrations" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "sport_type" VARCHAR(16),
    "season" INTEGER NOT NULL,
    "adpWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "needWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "tendencyWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "newsWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "rookieWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_draft_calibrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_adp_snapshots" (
    "id" TEXT NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "leagueType" VARCHAR(16) NOT NULL,
    "formatKey" VARCHAR(32) NOT NULL,
    "snapshotData" JSONB NOT NULL DEFAULT '[]',
    "totalDrafts" INTEGER NOT NULL DEFAULT 0,
    "totalPicks" INTEGER NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "ai_adp_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_adp_snapshot_history" (
    "id" TEXT NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "leagueType" VARCHAR(16) NOT NULL,
    "formatKey" VARCHAR(32) NOT NULL,
    "snapshotData" JSONB NOT NULL DEFAULT '[]',
    "totalDrafts" INTEGER NOT NULL DEFAULT 0,
    "totalPicks" INTEGER NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runMeta" JSONB,

    CONSTRAINT "ai_adp_snapshot_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "share_engagements" (
    "id" TEXT NOT NULL,
    "sleeperUsername" VARCHAR(64) NOT NULL,
    "shareType" VARCHAR(32) NOT NULL,
    "platform" VARCHAR(32) NOT NULL,
    "action" VARCHAR(16) NOT NULL,
    "style" VARCHAR(32),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_engagements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform_chat_threads" (
    "id" TEXT NOT NULL,
    "threadType" TEXT NOT NULL,
    "productType" TEXT NOT NULL DEFAULT 'shared',
    "title" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_chat_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform_chat_thread_members" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "platform_chat_thread_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform_chat_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderUserId" TEXT,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "visibleToUserId" TEXT,
    "messageSubtype" VARCHAR(32),
    "mentionedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "globalBroadcastId" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform_notifications" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT,
    "userId" TEXT NOT NULL,
    "productType" TEXT NOT NULL DEFAULT 'shared',
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'low',
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "platform_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "web_push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "engagement_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "podcast_episodes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(256) NOT NULL,
    "script" TEXT NOT NULL,
    "audioUrl" VARCHAR(1024),
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "podcast_episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "fantasy_media_episodes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "leagueId" VARCHAR(64),
    "mediaType" VARCHAR(32) NOT NULL,
    "title" VARCHAR(512) NOT NULL,
    "script" TEXT NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "provider" VARCHAR(64),
    "providerJobId" VARCHAR(256),
    "playbackUrl" VARCHAR(1024),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fantasy_media_episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "fantasy_media_publish_logs" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "destinationType" VARCHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "responseMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fantasy_media_publish_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "social_clips" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clipType" VARCHAR(64) NOT NULL,
    "title" VARCHAR(256) NOT NULL,
    "subtitle" VARCHAR(512),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_clips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "social_content_assets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "assetType" VARCHAR(64) NOT NULL,
    "title" VARCHAR(512) NOT NULL,
    "contentBody" TEXT NOT NULL,
    "provider" VARCHAR(64),
    "metadata" JSONB,
    "approvedForPublish" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_content_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "social_publish_targets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" VARCHAR(32) NOT NULL,
    "accountIdentifier" VARCHAR(256),
    "autoPostingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_publish_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "social_publish_logs" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "platform" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "responseMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_publish_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "shareable_moments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "shareType" VARCHAR(64) NOT NULL,
    "title" VARCHAR(512) NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shareable_moments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "share_publish_logs" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "platform" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "responseMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_publish_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform_blocked_users" (
    "id" TEXT NOT NULL,
    "blockerUserId" TEXT NOT NULL,
    "blockedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_blocked_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform_message_reports" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_message_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform_user_reports" (
    "id" TEXT NOT NULL,
    "reportedUserId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_user_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform_moderation_actions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "admin_audit_log" (
    "id" TEXT NOT NULL,
    "adminUserId" VARCHAR(64) NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "targetType" VARCHAR(32),
    "targetId" VARCHAR(128),
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" VARCHAR(128) NOT NULL,
    "purchaseType" VARCHAR(64),
    "status" VARCHAR(32) NOT NULL DEFAULT 'processing',
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "isBundle" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionPlanId" TEXT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "source" VARCHAR(32) NOT NULL DEFAULT 'stripe',
    "sku" VARCHAR(64),
    "stripeCustomerId" VARCHAR(128),
    "stripeSubscriptionId" VARCHAR(128),
    "stripeCheckoutSessionId" VARCHAR(128),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "gracePeriodEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "token_packages" (
    "id" TEXT NOT NULL,
    "sku" VARCHAR(64) NOT NULL,
    "title" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "tokenAmount" INTEGER NOT NULL,
    "priceUsdCents" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_token_balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lifetimePurchased" INTEGER NOT NULL DEFAULT 0,
    "lifetimeSpent" INTEGER NOT NULL DEFAULT 0,
    "lifetimeRefunded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_token_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "token_spend_rules" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "category" VARCHAR(32) NOT NULL,
    "featureLabel" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "tokenCost" INTEGER NOT NULL,
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_spend_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "token_refund_rules" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "description" TEXT,
    "maxAgeMinutes" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_refund_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "token_ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userTokenBalanceId" TEXT NOT NULL,
    "entryType" VARCHAR(32) NOT NULL,
    "tokenDelta" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "tokenPackageSku" VARCHAR(64),
    "spendRuleCode" VARCHAR(64),
    "refundRuleCode" VARCHAR(64),
    "sourceType" VARCHAR(64),
    "sourceId" VARCHAR(128),
    "idempotencyKey" VARCHAR(191),
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform_wallet_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "pendingBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_wallet_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "wallet_ledger_entries" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT,
    "walletAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "amountCents" INTEGER NOT NULL,
    "description" TEXT,
    "refProduct" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveAt" TIMESTAMP(3),

    CONSTRAINT "wallet_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "season_forecast_snapshots" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport_type" VARCHAR(16),
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "teamForecasts" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_forecast_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "dynasty_projection_snapshots" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport_type" VARCHAR(16),
    "teamId" VARCHAR(64) NOT NULL,
    "season" INTEGER NOT NULL,
    "projectedStrengthNextYear" DOUBLE PRECISION NOT NULL,
    "projectedStrength3Years" DOUBLE PRECISION NOT NULL,
    "projectedStrength5Years" DOUBLE PRECISION NOT NULL,
    "rebuildProbability" DOUBLE PRECISION NOT NULL,
    "contenderProbability" DOUBLE PRECISION NOT NULL,
    "windowStartYear" INTEGER,
    "windowEndYear" INTEGER,
    "volatilityScore" DOUBLE PRECISION NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dynasty_projection_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "player_career_projections" (
    "id" TEXT NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "playerId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "projectedPointsYear1" DOUBLE PRECISION NOT NULL,
    "projectedPointsYear2" DOUBLE PRECISION NOT NULL,
    "projectedPointsYear3" DOUBLE PRECISION NOT NULL,
    "projectedPointsYear4" DOUBLE PRECISION NOT NULL,
    "projectedPointsYear5" DOUBLE PRECISION NOT NULL,
    "breakoutProbability" DOUBLE PRECISION NOT NULL,
    "declineProbability" DOUBLE PRECISION NOT NULL,
    "volatilityScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_career_projections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "team_window_profiles" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport_type" VARCHAR(16),
    "teamId" VARCHAR(64) NOT NULL,
    "season" INTEGER NOT NULL,
    "windowStatus" VARCHAR(32) NOT NULL,
    "windowStartYear" INTEGER,
    "windowEndYear" INTEGER,
    "rebuildRiskScore" DOUBLE PRECISION NOT NULL,
    "dynastyStrengthScore" DOUBLE PRECISION NOT NULL,
    "trajectoryDirection" VARCHAR(16) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_window_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "graph_nodes" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeType" VARCHAR(32) NOT NULL,
    "entityId" VARCHAR(128) NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "season" INTEGER,
    "sport" VARCHAR(16),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "graph_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "graph_edges" (
    "id" TEXT NOT NULL,
    "edgeId" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "edgeType" VARCHAR(32) NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "season" INTEGER,
    "sport" VARCHAR(16),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "graph_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "league_graph_snapshots" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "season" INTEGER NOT NULL,
    "graphVersion" INTEGER NOT NULL DEFAULT 1,
    "nodeCount" INTEGER NOT NULL DEFAULT 0,
    "edgeCount" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_graph_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "league_dynasty_seasons" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "season" INTEGER NOT NULL,
    "platformLeagueId" VARCHAR(64) NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "league_dynasty_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "dynasty_backfill_status" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "status" VARCHAR(24) NOT NULL,
    "seasonsDiscovered" JSONB,
    "seasonsImported" JSONB,
    "seasonsSkipped" JSONB,
    "partialSeasons" JSONB,
    "lastStartedAt" TIMESTAMP(3),
    "lastCompletedAt" TIMESTAMP(3),
    "failureMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dynasty_backfill_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "dw_player_game_facts" (
    "factId" TEXT NOT NULL,
    "playerId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "gameId" VARCHAR(64) NOT NULL,
    "teamId" VARCHAR(32),
    "opponentTeamId" VARCHAR(32),
    "stat_payload" JSONB NOT NULL,
    "normalized_stats" JSONB NOT NULL,
    "fantasyPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoringPeriod" INTEGER NOT NULL DEFAULT 0,
    "season" INTEGER,
    "weekOrRound" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dw_player_game_facts_pkey" PRIMARY KEY ("factId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "dw_team_game_facts" (
    "factId" TEXT NOT NULL,
    "teamId" VARCHAR(32) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "gameId" VARCHAR(64) NOT NULL,
    "pointsScored" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "opponentPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "result" VARCHAR(8),
    "season" INTEGER,
    "weekOrRound" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dw_team_game_facts_pkey" PRIMARY KEY ("factId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "dw_roster_snapshots" (
    "snapshotId" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "teamId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "weekOrPeriod" INTEGER NOT NULL,
    "season" INTEGER,
    "roster_players" JSONB NOT NULL,
    "lineup_players" JSONB NOT NULL,
    "bench_players" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dw_roster_snapshots_pkey" PRIMARY KEY ("snapshotId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "dw_matchup_facts" (
    "matchupId" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "weekOrPeriod" INTEGER NOT NULL,
    "teamA" VARCHAR(64) NOT NULL,
    "teamB" VARCHAR(64) NOT NULL,
    "scoreA" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreB" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "winnerTeamId" VARCHAR(64),
    "season" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dw_matchup_facts_pkey" PRIMARY KEY ("matchupId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "dw_draft_facts" (
    "draftId" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "round" INTEGER NOT NULL,
    "pickNumber" INTEGER NOT NULL,
    "playerId" VARCHAR(64) NOT NULL,
    "managerId" VARCHAR(64),
    "season" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dw_draft_facts_pkey" PRIMARY KEY ("draftId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "dw_transaction_facts" (
    "transactionId" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "type" VARCHAR(24) NOT NULL,
    "playerId" VARCHAR(64),
    "managerId" VARCHAR(64),
    "rosterId" VARCHAR(64),
    "payload" JSONB,
    "season" INTEGER,
    "weekOrPeriod" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dw_transaction_facts_pkey" PRIMARY KEY ("transactionId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "dw_season_standing_facts" (
    "standingId" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "season" INTEGER NOT NULL,
    "teamId" VARCHAR(64) NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsAgainst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dw_season_standing_facts_pkey" PRIMARY KEY ("standingId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sim_matchup_results" (
    "simulationId" TEXT NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "leagueId" VARCHAR(64),
    "weekOrPeriod" INTEGER NOT NULL,
    "teamAId" VARCHAR(64),
    "teamBId" VARCHAR(64),
    "expectedScoreA" DOUBLE PRECISION NOT NULL,
    "expectedScoreB" DOUBLE PRECISION NOT NULL,
    "winProbabilityA" DOUBLE PRECISION NOT NULL,
    "winProbabilityB" DOUBLE PRECISION NOT NULL,
    "score_distribution_a" JSONB,
    "score_distribution_b" JSONB,
    "iterations" INTEGER NOT NULL DEFAULT 2000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sim_matchup_results_pkey" PRIMARY KEY ("simulationId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sim_season_results" (
    "resultId" TEXT NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "teamId" VARCHAR(64) NOT NULL,
    "season" INTEGER NOT NULL,
    "weekOrPeriod" INTEGER NOT NULL,
    "playoffProbability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "championshipProbability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedWins" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedRank" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "simulationsRun" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sim_season_results_pkey" PRIMARY KEY ("resultId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "dynasty_projections" (
    "projectionId" TEXT NOT NULL,
    "teamId" VARCHAR(64) NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "championshipWindowScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rebuildProbability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rosterStrength3Year" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rosterStrength5Year" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "agingRiskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "futureAssetScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "season" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dynasty_projections_pkey" PRIMARY KEY ("projectionId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_rule_violation_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "feature" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "iteration" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_rule_violation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_custom_rules" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "blockedPattern" TEXT,
    "requiredPattern" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_custom_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "mock_draft_rooms" (
    "id" TEXT NOT NULL,
    "createdById" TEXT,
    "sport" TEXT NOT NULL DEFAULT 'NFL',
    "numTeams" INTEGER NOT NULL DEFAULT 12,
    "numRounds" INTEGER NOT NULL DEFAULT 15,
    "timerSeconds" INTEGER NOT NULL DEFAULT 60,
    "scoringType" TEXT NOT NULL DEFAULT 'PPR',
    "rosterSettings" JSONB,
    "playerPool" TEXT NOT NULL DEFAULT 'all',
    "inviteCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "draftOrder" JSONB,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mock_draft_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "draft_room_pick_records" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT,
    "roomId" TEXT,
    "round" INTEGER NOT NULL,
    "pickNumber" INTEGER NOT NULL,
    "overallPick" INTEGER NOT NULL,
    "originalOwnerId" TEXT NOT NULL,
    "currentOwnerId" TEXT NOT NULL,
    "pickedById" TEXT,
    "playerId" TEXT,
    "playerName" TEXT,
    "position" TEXT,
    "team" TEXT,
    "isTraded" BOOLEAN NOT NULL DEFAULT false,
    "tradeSource" JSONB,
    "autopicked" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_room_pick_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "draft_room_user_queues" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "leagueId" TEXT,
    "roomId" TEXT,
    "playerIds" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_room_user_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "draft_room_chat_messages" (
    "id" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "leagueId" TEXT,
    "roomId" TEXT,
    "userId" TEXT,
    "authorDisplayName" TEXT,
    "authorAvatar" TEXT,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_room_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "draft_room_state" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "currentPick" INTEGER NOT NULL DEFAULT 1,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "currentTeamIndex" INTEGER NOT NULL DEFAULT 0,
    "timerEndsAt" TIMESTAMP(3),
    "timerPaused" BOOLEAN NOT NULL DEFAULT false,
    "pickOrder" JSONB,
    "leagueId" TEXT,
    "roomId" TEXT,
    "numTeams" INTEGER NOT NULL DEFAULT 12,
    "numRounds" INTEGER NOT NULL DEFAULT 15,
    "timerSeconds" INTEGER NOT NULL DEFAULT 60,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_room_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "draft_autopick_settings" (
    "userId" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_autopick_settings_pkey" PRIMARY KEY ("userId","sessionKey")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sport_configs" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT '',
    "slug" TEXT,
    "lineupFrequency" TEXT NOT NULL,
    "scoringType" TEXT NOT NULL,
    "defaultScoringSystem" TEXT NOT NULL DEFAULT 'points',
    "scoringCategories" JSONB,
    "scoringPresets" JSONB,
    "defaultRosterSlots" JSONB,
    "defaultBenchSlots" INTEGER NOT NULL DEFAULT 6,
    "defaultIRSlots" INTEGER NOT NULL DEFAULT 0,
    "defaultTaxiSlots" INTEGER NOT NULL DEFAULT 0,
    "defaultDevySlots" INTEGER NOT NULL DEFAULT 0,
    "positionEligibility" JSONB,
    "defaultSeasonWeeks" INTEGER NOT NULL DEFAULT 17,
    "defaultPlayoffStartWeek" INTEGER NOT NULL DEFAULT 15,
    "defaultPlayoffTeams" INTEGER NOT NULL DEFAULT 4,
    "defaultMatchupPeriodDays" INTEGER NOT NULL DEFAULT 7,
    "lineupLockType" TEXT NOT NULL DEFAULT 'per_player_kickoff',
    "supportsRedraft" BOOLEAN NOT NULL DEFAULT true,
    "supportsDynasty" BOOLEAN NOT NULL DEFAULT false,
    "supportsKeeper" BOOLEAN NOT NULL DEFAULT false,
    "supportsDevy" BOOLEAN NOT NULL DEFAULT false,
    "supportsC2C" BOOLEAN NOT NULL DEFAULT false,
    "supportsIDP" BOOLEAN NOT NULL DEFAULT false,
    "supportsSuperflex" BOOLEAN NOT NULL DEFAULT false,
    "supportsTEPremium" BOOLEAN NOT NULL DEFAULT false,
    "supportsPPR" BOOLEAN NOT NULL DEFAULT false,
    "supportsCategories" BOOLEAN NOT NULL DEFAULT false,
    "supportsDailyLineups" BOOLEAN NOT NULL DEFAULT false,
    "commissionerSettings" JSONB,
    "aiMetadata" JSONB,
    "hasIR" BOOLEAN NOT NULL DEFAULT true,
    "hasTaxi" BOOLEAN NOT NULL DEFAULT false,
    "hasBye" BOOLEAN NOT NULL DEFAULT false,
    "maxRosterSize" INTEGER NOT NULL DEFAULT 15,
    "defaultPositions" JSONB NOT NULL,
    "statCategories" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sport_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "redraft_seasons" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'setup',
    "totalWeeks" INTEGER NOT NULL,
    "playoffStartWeek" INTEGER NOT NULL,
    "currentWeek" INTEGER NOT NULL DEFAULT 0,
    "medianGame" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redraft_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "redraft_rosters" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "teamName" TEXT,
    "avatarUrl" TEXT,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsAgainst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "streak" TEXT,
    "playoffSeed" INTEGER,
    "faabBalance" DOUBLE PRECISION DEFAULT 100,
    "waiverPriority" INTEGER NOT NULL DEFAULT 0,
    "isEliminated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "redraft_rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "redraft_roster_players" (
    "id" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "team" TEXT,
    "sport" TEXT NOT NULL,
    "slotType" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "injuryStatus" TEXT,
    "byeWeek" INTEGER,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "droppedAt" TIMESTAMP(3),
    "acquisitionType" TEXT NOT NULL DEFAULT 'drafted',
    "isKept" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "redraft_roster_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "redraft_matchups" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'regular',
    "homeRosterId" TEXT NOT NULL,
    "awayRosterId" TEXT,
    "homeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "awayScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "homeProjected" DOUBLE PRECISION,
    "awayProjected" DOUBLE PRECISION,
    "homeWinPct" DOUBLE PRECISION,
    "awayWinPct" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "isMedianMatchup" BOOLEAN NOT NULL DEFAULT false,
    "medianScore" DOUBLE PRECISION,
    "lineupSnapshots" JSONB,

    CONSTRAINT "redraft_matchups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "redraft_waiver_claims" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "addPlayerId" TEXT NOT NULL,
    "addPlayerName" TEXT NOT NULL,
    "dropPlayerId" TEXT,
    "dropPlayerName" TEXT,
    "bidAmount" DOUBLE PRECISION,
    "priority" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "denialReason" TEXT,

    CONSTRAINT "redraft_waiver_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "redraft_league_trades" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "proposerId" TEXT NOT NULL,
    "proposerRosterId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "receiverRosterId" TEXT NOT NULL,
    "proposerOffers" JSONB NOT NULL,
    "receiverOffers" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "vetoCount" INTEGER NOT NULL DEFAULT 0,
    "vetoThreshold" INTEGER NOT NULL DEFAULT 4,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "notes" TEXT,
    "aiGrade" TEXT,
    "aiSummary" TEXT,
    "aiFairnessScore" DOUBLE PRECISION,
    "aiCollusionFlag" BOOLEAN NOT NULL DEFAULT false,
    "aiCollusionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redraft_league_trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "redraft_league_transactions" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redraft_league_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "player_weekly_scores" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "stats" JSONB NOT NULL,
    "fantasyPts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_weekly_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "redraft_playoff_brackets" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redraft_playoff_brackets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "redraft_ai_league_insights" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "rosterId" TEXT,
    "content" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redraftSeasonId" TEXT,

    CONSTRAINT "redraft_ai_league_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "redraft_ai_roster_insights" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "startSitRecs" JSONB NOT NULL,
    "waiverRecs" JSONB NOT NULL,
    "tradeTargets" JSONB NOT NULL,
    "lineupScore" DOUBLE PRECISION,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redraft_ai_roster_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "keeper_records" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "team" TEXT,
    "sport" TEXT NOT NULL,
    "originalDraftRound" INTEGER,
    "originalDraftYear" INTEGER NOT NULL,
    "originalAuctionPrice" DOUBLE PRECISION,
    "yearsKept" INTEGER NOT NULL DEFAULT 1,
    "costRound" INTEGER,
    "costAuctionValue" DOUBLE PRECISION,
    "costLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submittedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "acquisitionType" TEXT NOT NULL DEFAULT 'drafted',

    CONSTRAINT "keeper_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "keeper_selection_sessions" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3) NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "totalTeams" INTEGER NOT NULL,
    "teamsSubmitted" INTEGER NOT NULL DEFAULT 0,
    "teamsLocked" INTEGER NOT NULL DEFAULT 0,
    "conflictsDetected" JSONB,
    "conflictsResolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "keeper_selection_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "keeper_eligibilities" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "isEligible" BOOLEAN NOT NULL DEFAULT true,
    "ineligibleReason" TEXT,
    "yearsKept" INTEGER NOT NULL DEFAULT 0,
    "projectedCost" TEXT,
    "projectedCostRound" INTEGER,
    "projectedCostAuction" DOUBLE PRECISION,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keeper_eligibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "keeper_pick_adjustments" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "keeperRecordId" TEXT NOT NULL,
    "pickRoundForfeited" INTEGER NOT NULL,
    "pickSlotForfeited" INTEGER,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'applied',

    CONSTRAINT "keeper_pick_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "keeper_audit_logs" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "playerId" TEXT,
    "playerName" TEXT,
    "detail" JSONB,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keeper_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "best_ball_sport_templates" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'standard',
    "rosterSize" INTEGER NOT NULL,
    "startCount" INTEGER NOT NULL,
    "lineupSlots" JSONB NOT NULL,
    "scoringPeriod" TEXT NOT NULL,
    "scoringWeeks" INTEGER,
    "tiebreaker" TEXT NOT NULL DEFAULT 'points_for',
    "lockRule" TEXT NOT NULL DEFAULT 'game_start',
    "depthRequirements" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "best_ball_sport_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "best_ball_optimized_lineups" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT,
    "seasonId" TEXT,
    "rosterId" TEXT,
    "contestId" TEXT,
    "entryId" TEXT,
    "week" INTEGER NOT NULL,
    "scoringPeriod" TEXT NOT NULL DEFAULT 'weekly',
    "starterIds" TEXT[],
    "benchIds" TEXT[],
    "totalPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineupBreakdown" JSONB NOT NULL,
    "alternateExists" BOOLEAN NOT NULL DEFAULT false,
    "alternateLineup" JSONB,
    "optimizerLog" JSONB,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "best_ball_optimized_lineups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "best_ball_contests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'tournament',
    "status" TEXT NOT NULL DEFAULT 'open',
    "podSize" INTEGER NOT NULL DEFAULT 12,
    "rosterSize" INTEGER NOT NULL DEFAULT 18,
    "rounds" INTEGER NOT NULL DEFAULT 1,
    "advancersPerPod" INTEGER NOT NULL DEFAULT 1,
    "draftType" TEXT NOT NULL DEFAULT 'snake',
    "draftSpeed" TEXT NOT NULL DEFAULT 'slow',
    "entryType" TEXT NOT NULL DEFAULT 'single',
    "maxEntriesPerUser" INTEGER,
    "totalEntries" INTEGER,
    "scoringPeriod" TEXT NOT NULL DEFAULT 'weekly',
    "cumulativeScoring" BOOLEAN NOT NULL DEFAULT true,
    "resetBetweenRounds" BOOLEAN NOT NULL DEFAULT false,
    "draftStartsAt" TIMESTAMP(3),
    "contestStartsAt" TIMESTAMP(3),
    "contestEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "best_ball_contests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "best_ball_pods" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL DEFAULT 1,
    "podNumber" INTEGER NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'forming',
    "draftSessionId" TEXT,
    "advancers" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "best_ball_pods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "best_ball_entries" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "podId" TEXT,
    "userId" TEXT NOT NULL,
    "entryName" TEXT,
    "entryNumber" INTEGER NOT NULL DEFAULT 1,
    "podRank" INTEGER,
    "overallRank" INTEGER,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "totalPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isEliminated" BOOLEAN NOT NULL DEFAULT false,
    "hasAdvanced" BOOLEAN NOT NULL DEFAULT false,
    "roster" JSONB,
    "weeklyScores" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "best_ball_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "best_ball_roster_validations" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT,
    "contestId" TEXT,
    "rosterId" TEXT,
    "entryId" TEXT,
    "isValid" BOOLEAN NOT NULL,
    "warnings" JSONB NOT NULL,
    "criticalErrors" JSONB NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "best_ball_roster_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "best_ball_ai_insights" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT,
    "contestId" TEXT,
    "rosterId" TEXT,
    "entryId" TEXT,
    "week" INTEGER,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "narrative" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "best_ball_ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "guillotine_seasons" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "redraftSeasonId" TEXT,
    "sport" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'setup',
    "totalTeamsStarted" INTEGER NOT NULL,
    "currentTeamsActive" INTEGER NOT NULL,
    "currentScoringPeriod" INTEGER NOT NULL DEFAULT 0,
    "isInFinalStage" BOOLEAN NOT NULL DEFAULT false,
    "finalStageStartPeriod" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guillotine_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "guillotine_eliminations" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "eliminatedRosterId" TEXT NOT NULL,
    "eliminatedTeamName" TEXT NOT NULL,
    "eliminatedOwnerId" TEXT NOT NULL,
    "scoringPeriod" INTEGER NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "rankAmongActive" INTEGER NOT NULL,
    "marginBelowSafe" DOUBLE PRECISION NOT NULL,
    "wasTiebreaker" BOOLEAN NOT NULL DEFAULT false,
    "tiebreakerType" TEXT,
    "tiedWithRosterId" TEXT,
    "aiEliminationSummary" TEXT,
    "aiCollapseReason" TEXT,
    "eliminatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guillotine_eliminations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "guillotine_survival_logs" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "scoringPeriod" INTEGER NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "rankAmongActive" INTEGER NOT NULL,
    "teamsActiveThisPeriod" INTEGER NOT NULL,
    "survivalStatus" TEXT NOT NULL,
    "marginAboveChopLine" DOUBLE PRECISION NOT NULL,
    "wasInDangerZone" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "guillotine_survival_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "guillotine_waiver_releases" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "eliminatedRosterId" TEXT NOT NULL,
    "scoringPeriod" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "team" TEXT,
    "sport" TEXT NOT NULL,
    "releaseStatus" TEXT NOT NULL DEFAULT 'pending',
    "availableAt" TIMESTAMP(3) NOT NULL,
    "claimedByRosterId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "winningBid" DOUBLE PRECISION,

    CONSTRAINT "guillotine_waiver_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "guillotine_ai_insights" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "scoringPeriod" INTEGER,
    "rosterId" TEXT,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "narrative" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guillotine_ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WeatherCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "forecastForTime" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "temperatureF" DOUBLE PRECISION,
    "feelsLikeF" DOUBLE PRECISION,
    "windSpeedMph" DOUBLE PRECISION,
    "windGustsMph" DOUBLE PRECISION,
    "windDirectionDeg" DOUBLE PRECISION,
    "precipChancePct" DOUBLE PRECISION,
    "rainInches" DOUBLE PRECISION,
    "snowInches" DOUBLE PRECISION,
    "humidityPct" DOUBLE PRECISION,
    "visibilityMiles" DOUBLE PRECISION,
    "conditionCode" TEXT,
    "conditionLabel" TEXT,
    "cloudCoverPct" DOUBLE PRECISION,
    "isIndoor" BOOLEAN NOT NULL DEFAULT false,
    "isDome" BOOLEAN NOT NULL DEFAULT false,
    "roofClosed" BOOLEAN NOT NULL DEFAULT false,
    "sport" TEXT,
    "eventId" TEXT,
    "dataSource" TEXT NOT NULL DEFAULT 'openweathermap',
    "apiResponseRaw" JSONB,

    CONSTRAINT "WeatherCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AFProjectionSnapshot" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "week" INTEGER,
    "season" INTEGER NOT NULL,
    "eventId" TEXT,
    "baselineProjection" DOUBLE PRECISION NOT NULL,
    "weatherAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "afProjection" DOUBLE PRECISION NOT NULL,
    "weatherCacheId" TEXT,
    "adjustmentFactors" JSONB,
    "adjustmentReason" TEXT,
    "confidenceLevel" TEXT NOT NULL DEFAULT 'medium',
    "isOutdoorGame" BOOLEAN NOT NULL DEFAULT true,
    "venueOverride" BOOLEAN NOT NULL DEFAULT false,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "snapshotLookupKey" TEXT NOT NULL,

    CONSTRAINT "AFProjectionSnapshot_pkey" PRIMARY KEY ("id")
);


-- -----------------------------------------------------------------------------
-- Idempotent: ensure sport_type exists on tables that may predate the column.
-- When CREATE TABLE IF NOT EXISTS skips (table already there), new columns are not
-- applied — indexes on sport_type then fail with 42703.
-- Run as part of full baseline, or standalone after partial migrations.
-- Safe to re-run (ADD COLUMN IF NOT EXISTS).
-- -----------------------------------------------------------------------------

ALTER TABLE "rankings_snapshots" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "roster_templates" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(12);
ALTER TABLE "scoring_templates" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(12);
ALTER TABLE "sport_feature_flags" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(12);
ALTER TABLE "schedule_templates" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(12);
ALTER TABLE "season_calendars" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(12);
ALTER TABLE "game_schedules" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(12);
ALTER TABLE "player_game_stats" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(12);
ALTER TABLE "team_game_stats" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(12);
ALTER TABLE "stat_ingestion_jobs" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(12);
ALTER TABLE "waiver_claims" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "waiver_transactions" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "draft_picks" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "draft_prediction_snapshots" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "draft_retrospectives" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "league_draft_calibrations" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "season_forecast_snapshots" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "dynasty_projection_snapshots" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "team_window_profiles" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);


-- -----------------------------------------------------------------------------
-- Idempotent: ensure "sport" exists (legacy DBs may predate the column).
-- Safe to re-run. See scripts/generate-ensure-sport-columns.mjs
-- -----------------------------------------------------------------------------

ALTER TABLE "SportsTeam" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "SportsPlayer" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "PlayerIdentityMap" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "player_team_history" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "SportsGame" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "SportsInjury" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "SportsNews" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "sports_players" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "team_assets" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "injury_reports" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "adp_data" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "player_news" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "PlatformIdentity" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "LegacyLeague" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "AILeagueContext" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "LeagueTrade" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "TradeLearningInsight" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "YahooLeague" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "InsightEvent" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "AIIssue" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "AIIssueFeedback" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "FantraxLeague" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "player_season_stats" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "trending_players" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "depth_charts" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "team_season_stats" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "ProviderSyncState" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "hall_of_fame_entries" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "hall_of_fame_moments" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "legacy_score_records" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "legacy_evidence_records" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "DevyPlayer" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(8);
ALTER TABLE "creator_leagues" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "BracketTournament" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "rivalry_records" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "manager_psych_profiles" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "profile_evidence_records" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "drama_events" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "drama_timeline_records" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "manager_reputation_records" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "reputation_evidence_records" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "reputation_config_records" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "gm_progression_events" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "xp_events" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "award_records" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "record_book_entries" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "media_articles" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "blog_articles" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "blog_drafts" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "broadcast_sessions" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "commentary_entries" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "sport" "LeagueSport";
ALTER TABLE "player_status_events" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(8);
ALTER TABLE "tournament_shells" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "ai_commissioner_configs" ADD COLUMN IF NOT EXISTS "sport" "LeagueSport";
ALTER TABLE "ai_commissioner_alerts" ADD COLUMN IF NOT EXISTS "sport" "LeagueSport";
ALTER TABLE "ai_commissioner_action_logs" ADD COLUMN IF NOT EXISTS "sport" "LeagueSport";
ALTER TABLE "find_league_listings" ADD COLUMN IF NOT EXISTS "sport" "LeagueSport";
ALTER TABLE "league_divisions" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "survivor_token_pool_picks" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "zombie_universes" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "zombie_leagues" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "zombie_rules_templates" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "zombie_rules_documents" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "devy_class_strength_snapshots" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(8);
ALTER TABLE "c2c_player_states" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "player_meta_trends" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "trend_signal_events" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "strategy_meta_reports" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "strategy_meta_snapshots" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "global_meta_snapshots" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "position_meta_trends" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "ai_adp_snapshots" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "ai_adp_snapshot_history" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "fantasy_media_episodes" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "social_content_assets" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "shareable_moments" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "player_career_projections" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "graph_nodes" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "graph_edges" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);
ALTER TABLE "dw_player_game_facts" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "dw_team_game_facts" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "dw_roster_snapshots" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "dw_matchup_facts" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "dw_draft_facts" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "dw_transaction_facts" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "dw_season_standing_facts" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "sim_matchup_results" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "sim_season_results" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "dynasty_projections" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(12);
ALTER TABLE "mock_draft_rooms" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "sport_configs" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "redraft_seasons" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "redraft_roster_players" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "player_weekly_scores" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "keeper_records" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "best_ball_sport_templates" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "best_ball_contests" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "guillotine_seasons" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "guillotine_waiver_releases" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "WeatherCache" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "AFProjectionSnapshot" ADD COLUMN IF NOT EXISTS "sport" TEXT;



-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EarlyAccessSignup_email_key" ON "EarlyAccessSignup"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EarlyAccessSignup_createdAt_idx" ON "EarlyAccessSignup"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EarlyAccessSignup_confirmedAt_idx" ON "EarlyAccessSignup"("confirmedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EarlyAccessSignup_source_idx" ON "EarlyAccessSignup"("source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EarlyAccessSignup_utmSource_idx" ON "EarlyAccessSignup"("utmSource");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "VisitorLocation_ipAddress_key" ON "VisitorLocation"("ipAddress");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VisitorLocation_country_idx" ON "VisitorLocation"("country");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VisitorLocation_lastSeen_idx" ON "VisitorLocation"("lastSeen");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QuestionnaireResponse_email_idx" ON "QuestionnaireResponse"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SportsDataCache_expiresAt_idx" ON "SportsDataCache"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SportsTeam_sport_idx" ON "SportsTeam"("sport");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SportsTeam_sport_externalId_source_key" ON "SportsTeam"("sport", "externalId", "source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SportsPlayer_sport_team_idx" ON "SportsPlayer"("sport", "team");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SportsPlayer_sleeperId_idx" ON "SportsPlayer"("sleeperId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SportsPlayer_name_idx" ON "SportsPlayer"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SportsPlayer_sport_externalId_source_key" ON "SportsPlayer"("sport", "externalId", "source");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PlayerIdentityMap_sleeperId_key" ON "PlayerIdentityMap"("sleeperId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerIdentityMap_normalizedName_idx" ON "PlayerIdentityMap"("normalizedName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerIdentityMap_fantasyCalcId_idx" ON "PlayerIdentityMap"("fantasyCalcId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerIdentityMap_rollingInsightsId_idx" ON "PlayerIdentityMap"("rollingInsightsId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerIdentityMap_apiSportsId_idx" ON "PlayerIdentityMap"("apiSportsId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerIdentityMap_espnId_idx" ON "PlayerIdentityMap"("espnId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerIdentityMap_clearSportsId_idx" ON "PlayerIdentityMap"("clearSportsId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerIdentityMap_currentTeam_idx" ON "PlayerIdentityMap"("currentTeam");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerIdentityMap_sport_position_idx" ON "PlayerIdentityMap"("sport", "position");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_team_history_playerId_sport_season_idx" ON "player_team_history"("playerId", "sport", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_team_history_teamAbbr_sport_season_idx" ON "player_team_history"("teamAbbr", "sport", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "player_team_history_playerId_sport_season_week_key" ON "player_team_history"("playerId", "sport", "season", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SportsGame_sport_startTime_idx" ON "SportsGame"("sport", "startTime");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SportsGame_sport_season_week_idx" ON "SportsGame"("sport", "season", "week");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SportsGame_sport_externalId_source_key" ON "SportsGame"("sport", "externalId", "source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SportsInjury_sport_team_idx" ON "SportsInjury"("sport", "team");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SportsInjury_playerName_idx" ON "SportsInjury"("playerName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SportsInjury_playerId_idx" ON "SportsInjury"("playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SportsInjury_sport_season_week_idx" ON "SportsInjury"("sport", "season", "week");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SportsInjury_sport_externalId_source_key" ON "SportsInjury"("sport", "externalId", "source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SportsNews_sport_publishedAt_idx" ON "SportsNews"("sport", "publishedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SportsNews_playerName_idx" ON "SportsNews"("playerName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SportsNews_team_idx" ON "SportsNews"("team");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SportsNews_category_idx" ON "SportsNews"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SportsNews_sentiment_idx" ON "SportsNews"("sentiment");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SportsNews_sport_externalId_source_key" ON "SportsNews"("sport", "externalId", "source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sports_players_sport_team_idx" ON "sports_players"("sport", "team");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sports_players_sport_position_idx" ON "sports_players"("sport", "position");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sports_players_sport_name_idx" ON "sports_players"("sport", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sports_players_last_updated_idx" ON "sports_players"("last_updated");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_assets_sport_idx" ON "team_assets"("sport");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "team_assets_sport_team_code_key" ON "team_assets"("sport", "team_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "injury_reports_sport_week_report_date_idx" ON "injury_reports"("sport", "week", "report_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "injury_reports_sport_player_id_report_date_idx" ON "injury_reports"("sport", "player_id", "report_date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "injury_reports_sport_player_id_report_date_status_key" ON "injury_reports"("sport", "player_id", "report_date", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "adp_data_sport_format_scoring_week_season_idx" ON "adp_data"("sport", "format", "scoring", "week", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "adp_data_player_id_created_at_idx" ON "adp_data"("player_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "adp_data_sport_format_scoring_player_id_week_season_source_key" ON "adp_data"("sport", "format", "scoring", "player_id", "week", "season", "source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_news_sport_published_at_idx" ON "player_news"("sport", "published_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_news_player_id_published_at_idx" ON "player_news"("player_id", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "player_news_sport_player_name_headline_published_at_key" ON "player_news"("sport", "player_name", "headline", "published_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "api_rate_limits_provider_window_start_window_end_idx" ON "api_rate_limits"("provider", "window_start", "window_end");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "api_rate_limits_provider_endpoint_window_start_window_end_key" ON "api_rate_limits"("provider", "endpoint", "window_start", "window_end");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "api_call_log_provider_called_at_idx" ON "api_call_log"("provider", "called_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "api_call_log_provider_endpoint_called_at_idx" ON "api_call_log"("provider", "endpoint", "called_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LegacyUser_sleeperUsername_key" ON "LegacyUser"("sleeperUsername");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LegacyUser_sleeperUserId_key" ON "LegacyUser"("sleeperUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegacyUser_sleeperUsername_idx" ON "LegacyUser"("sleeperUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserEvent_userId_idx" ON "UserEvent"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserEvent_eventType_idx" ON "UserEvent"("eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserEvent_createdAt_idx" ON "UserEvent"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserEvent_userId_eventType_idx" ON "UserEvent"("userId", "eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "legacy_user_rank_cache_last_calculated_idx" ON "legacy_user_rank_cache"("last_calculated_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "legacy_user_rank_cache_last_refresh_idx" ON "legacy_user_rank_cache"("last_refresh_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlatformIdentity_userId_idx" ON "PlatformIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformIdentity_platform_platformUserId_key" ON "PlatformIdentity"("platform", "platformUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegacyImportJob_userId_status_idx" ON "LegacyImportJob"("userId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegacyLeague_userId_season_idx" ON "LegacyLeague"("userId", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LegacyLeague_userId_sleeperLeagueId_key" ON "LegacyLeague"("userId", "sleeperLeagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegacyRoster_leagueId_idx" ON "LegacyRoster"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegacyRoster_ownerId_idx" ON "LegacyRoster"("ownerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegacyRoster_leagueId_ownerId_idx" ON "LegacyRoster"("leagueId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LegacyRoster_leagueId_rosterId_key" ON "LegacyRoster"("leagueId", "rosterId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LegacySeasonSummary_leagueId_key" ON "LegacySeasonSummary"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegacyAIReport_userId_reportType_idx" ON "LegacyAIReport"("userId", "reportType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_emailHash_idx" ON "AnalyticsEvent"("emailHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_toolKey_idx" ON "AnalyticsEvent"("toolKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_event_createdAt_idx" ON "AnalyticsEvent"("event", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_path_createdAt_idx" ON "AnalyticsEvent"("path", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TradeNotification_transactionId_key" ON "TradeNotification"("transactionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeNotification_userId_status_idx" ON "TradeNotification"("userId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeNotification_userId_seenAt_idx" ON "TradeNotification"("userId", "seenAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeNotification_leagueId_idx" ON "TradeNotification"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EmailPreference_email_key" ON "EmailPreference"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmailPreference_legacyUserId_idx" ON "EmailPreference"("legacyUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmailPreference_sleeperUsername_idx" ON "EmailPreference"("sleeperUsername");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AIUserProfile_userId_key" ON "AIUserProfile"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIUserProfile_sleeperUsername_idx" ON "AIUserProfile"("sleeperUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trade_suggestion_votes_userId_idx" ON "trade_suggestion_votes"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trade_suggestion_votes_userId_createdAt_idx" ON "trade_suggestion_votes"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trade_suggestion_votes_vote_idx" ON "trade_suggestion_votes"("vote");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trade_feedback_userId_createdAt_idx" ON "trade_feedback"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trade_feedback_vote_idx" ON "trade_feedback"("vote");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trade_feedback_reason_idx" ON "trade_feedback"("reason");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "trade_profiles_userId_key" ON "trade_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AILeagueContext_leagueId_key" ON "AILeagueContext"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AILeagueContext_sport_idx" ON "AILeagueContext"("sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AILeagueContext_phase_idx" ON "AILeagueContext"("phase");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AITeamStateSnapshot_leagueId_teamId_idx" ON "AITeamStateSnapshot"("leagueId", "teamId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AITeamStateSnapshot_sleeperUsername_idx" ON "AITeamStateSnapshot"("sleeperUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AITeamStateSnapshot_computedAt_idx" ON "AITeamStateSnapshot"("computedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_memories_userId_idx" ON "ai_memories"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_memories_leagueId_idx" ON "ai_memories"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_memories_scope_idx" ON "ai_memories"("scope");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ai_memories_userId_leagueId_scope_key_key" ON "ai_memories"("userId", "leagueId", "scope", "key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIMemoryEvent_userId_idx" ON "AIMemoryEvent"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIMemoryEvent_leagueId_idx" ON "AIMemoryEvent"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIMemoryEvent_eventType_idx" ON "AIMemoryEvent"("eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIMemoryEvent_expiresAt_idx" ON "AIMemoryEvent"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIUserFeedback_userId_idx" ON "AIUserFeedback"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIUserFeedback_leagueId_idx" ON "AIUserFeedback"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIUserFeedback_actionType_idx" ON "AIUserFeedback"("actionType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeFeedback_sleeperUsername_idx" ON "TradeFeedback"("sleeperUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeFeedback_leagueId_idx" ON "TradeFeedback"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeFeedback_rating_idx" ON "TradeFeedback"("rating");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeFeedback_createdAt_idx" ON "TradeFeedback"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TradePreferences_sleeperUsername_key" ON "TradePreferences"("sleeperUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradePreferences_sleeperUsername_idx" ON "TradePreferences"("sleeperUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeagueTradeHistory_sleeperUsername_idx" ON "LeagueTradeHistory"("sleeperUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeagueTradeHistory_status_idx" ON "LeagueTradeHistory"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LeagueTradeHistory_sleeperLeagueId_sleeperUsername_key" ON "LeagueTradeHistory"("sleeperLeagueId", "sleeperUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeagueTrade_historyId_idx" ON "LeagueTrade"("historyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeagueTrade_analyzed_idx" ON "LeagueTrade"("analyzed");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeagueTrade_season_idx" ON "LeagueTrade"("season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeagueTrade_platform_idx" ON "LeagueTrade"("platform");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeagueTrade_sport_idx" ON "LeagueTrade"("sport");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LeagueTrade_historyId_transactionId_key" ON "LeagueTrade"("historyId", "transactionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeLearningInsight_insightType_idx" ON "TradeLearningInsight"("insightType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeLearningInsight_position_idx" ON "TradeLearningInsight"("position");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeLearningInsight_season_idx" ON "TradeLearningInsight"("season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TradeLearningInsight_insightType_playerName_position_ageRan_key" ON "TradeLearningInsight"("insightType", "playerName", "position", "ageRange", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TradeLearningStats_season_key" ON "TradeLearningStats"("season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradePreAnalysisCache_sleeperUsername_idx" ON "TradePreAnalysisCache"("sleeperUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradePreAnalysisCache_status_idx" ON "TradePreAnalysisCache"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TradePreAnalysisCache_sleeperUsername_sleeperLeagueId_key" ON "TradePreAnalysisCache"("sleeperUsername", "sleeperLeagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeagueTypeSubmission_email_idx" ON "LeagueTypeSubmission"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeagueTypeSubmission_status_idx" ON "LeagueTypeSubmission"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeagueTypeSubmission_createdAt_idx" ON "LeagueTypeSubmission"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegacyFeedback_status_idx" ON "LegacyFeedback"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegacyFeedback_feedbackType_idx" ON "LegacyFeedback"("feedbackType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegacyFeedback_tool_idx" ON "LegacyFeedback"("tool");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegacyFeedback_priority_idx" ON "LegacyFeedback"("priority");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegacyFeedback_aiSeverity_idx" ON "LegacyFeedback"("aiSeverity");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegacyFeedback_createdAt_idx" ON "LegacyFeedback"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "YahooConnection_yahooUserId_key" ON "YahooConnection"("yahooUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "YahooConnection_yahooUserId_idx" ON "YahooConnection"("yahooUserId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "YahooLeague_yahooLeagueKey_key" ON "YahooLeague"("yahooLeagueKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "YahooLeague_connectionId_idx" ON "YahooLeague"("connectionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "YahooLeague_sport_idx" ON "YahooLeague"("sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "YahooLeague_season_idx" ON "YahooLeague"("season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "YahooTeam_yahooTeamKey_key" ON "YahooTeam"("yahooTeamKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "YahooTeam_leagueId_idx" ON "YahooTeam"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "YahooTeam_isUserTeam_idx" ON "YahooTeam"("isUserTeam");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MFLConnection_sessionId_key" ON "MFLConnection"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MFLConnection_mflUsername_key" ON "MFLConnection"("mflUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MFLConnection_mflUsername_idx" ON "MFLConnection"("mflUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InsightEvent_eventType_idx" ON "InsightEvent"("eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InsightEvent_insightId_idx" ON "InsightEvent"("insightId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InsightEvent_confidenceLevel_idx" ON "InsightEvent"("confidenceLevel");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InsightEvent_createdAt_idx" ON "InsightEvent"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIIssue_status_idx" ON "AIIssue"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIIssue_priority_idx" ON "AIIssue"("priority");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIIssue_area_idx" ON "AIIssue"("area");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIIssue_createdAt_idx" ON "AIIssue"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIIssueFeedback_issueId_idx" ON "AIIssueFeedback"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FantraxUser_fantraxUsername_key" ON "FantraxUser"("fantraxUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FantraxUser_fantraxUsername_idx" ON "FantraxUser"("fantraxUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FantraxLeague_userId_season_idx" ON "FantraxLeague"("userId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FantraxLeague_season_idx" ON "FantraxLeague"("season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FantraxLeague_userId_leagueName_season_key" ON "FantraxLeague"("userId", "leagueName", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SleeperImportCache_sleeperUsername_idx" ON "SleeperImportCache"("sleeperUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SleeperImportCache_sleeperLeagueId_idx" ON "SleeperImportCache"("sleeperLeagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SleeperImportCache_sleeperUsername_sleeperLeagueId_key" ON "SleeperImportCache"("sleeperUsername", "sleeperLeagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_trade_block_league_active" ON "trade_block_entries"("sleeperLeagueId", "isActive", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_trade_block_roster" ON "trade_block_entries"("sleeperLeagueId", "rosterId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "uq_trade_block_active" ON "trade_block_entries"("sleeperLeagueId", "playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trade_analysis_snapshots_leagueId_sleeperUsername_snapshotT_idx" ON "trade_analysis_snapshots"("leagueId", "sleeperUsername", "snapshotType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trade_analysis_snapshots_sleeperUsername_createdAt_idx" ON "trade_analysis_snapshots"("sleeperUsername", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trade_analysis_snapshots_expiresAt_idx" ON "trade_analysis_snapshots"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "share_rewards_sleeperUsername_idx" ON "share_rewards"("sleeperUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "share_rewards_createdAt_idx" ON "share_rewards"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "share_rewards_redeemed_idx" ON "share_rewards"("redeemed");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "decision_logs_userId_idx" ON "decision_logs"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "decision_logs_leagueId_idx" ON "decision_logs"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "decision_logs_userId_leagueId_idx" ON "decision_logs"("userId", "leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "decision_logs_decisionType_idx" ON "decision_logs"("decisionType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "decision_logs_userFollowed_idx" ON "decision_logs"("userFollowed");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "decision_logs_createdAt_idx" ON "decision_logs"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "decision_logs_resolvedAt_idx" ON "decision_logs"("resolvedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "decision_logs_numericConfidence_idx" ON "decision_logs"("numericConfidence");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "decision_outcomes_decisionLogId_key" ON "decision_outcomes"("decisionLogId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "decision_outcomes_decisionLogId_idx" ON "decision_outcomes"("decisionLogId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "decision_outcomes_evaluatedAt_idx" ON "decision_outcomes"("evaluatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "decision_outcomes_outcomeGrade_idx" ON "decision_outcomes"("outcomeGrade");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "decision_outcomes_actualResult_idx" ON "decision_outcomes"("actualResult");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TradeOfferEvent_inputHash_key" ON "TradeOfferEvent"("inputHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeOfferEvent_leagueId_createdAt_idx" ON "TradeOfferEvent"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeOfferEvent_senderUserId_createdAt_idx" ON "TradeOfferEvent"("senderUserId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeOfferEvent_opponentUserId_createdAt_idx" ON "TradeOfferEvent"("opponentUserId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeOfferEvent_mode_createdAt_idx" ON "TradeOfferEvent"("mode", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeOfferEvent_leagueTradeId_idx" ON "TradeOfferEvent"("leagueTradeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TradeOutcomeEvent_offerEventId_key" ON "TradeOutcomeEvent"("offerEventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeOutcomeEvent_leagueId_createdAt_idx" ON "TradeOutcomeEvent"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeOutcomeEvent_outcome_createdAt_idx" ON "TradeOutcomeEvent"("outcome", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeOutcomeEvent_leagueTradeId_idx" ON "TradeOutcomeEvent"("leagueTradeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ModelMetricsDaily_day_idx" ON "ModelMetricsDaily"("day");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ModelMetricsDaily_day_mode_segmentKey_key" ON "ModelMetricsDaily"("day", "mode", "segmentKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LearnedWeights_leagueClass_idx" ON "LearnedWeights"("leagueClass");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LearnedWeights_leagueClass_season_key" ON "LearnedWeights"("leagueClass", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RankingWeightsWeekly_segmentKey_status_idx" ON "RankingWeightsWeekly"("segmentKey", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RankingWeightsWeekly_weekStart_idx" ON "RankingWeightsWeekly"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RankingWeightsWeekly_segmentKey_weekStart_key" ON "RankingWeightsWeekly"("segmentKey", "weekStart");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeagueDemandWeekly_leagueId_idx" ON "LeagueDemandWeekly"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeagueDemandWeekly_weekStart_idx" ON "LeagueDemandWeekly"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LeagueDemandWeekly_leagueId_weekStart_rangeDays_key" ON "LeagueDemandWeekly"("leagueId", "weekStart", "rangeDays");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NarrativeValidationLog_mode_idx" ON "NarrativeValidationLog"("mode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NarrativeValidationLog_contractType_idx" ON "NarrativeValidationLog"("contractType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NarrativeValidationLog_valid_idx" ON "NarrativeValidationLog"("valid");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NarrativeValidationLog_createdAt_idx" ON "NarrativeValidationLog"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pecr_logs_feature_idx" ON "pecr_logs"("feature");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pecr_logs_passed_idx" ON "pecr_logs"("passed");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pecr_logs_createdAt_idx" ON "pecr_logs"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pecr_logs_feature_createdAt_idx" ON "pecr_logs"("feature", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_codebase_edits_filePath_idx" ON "ai_codebase_edits"("filePath");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_codebase_edits_editedAt_idx" ON "ai_codebase_edits"("editedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "manager_dna_sleeperUserId_idx" ON "manager_dna"("sleeperUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "manager_dna_lastComputedAt_idx" ON "manager_dna"("lastComputedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "manager_dna_sleeperUsername_key" ON "manager_dna"("sleeperUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "opponent_tendencies_leagueId_idx" ON "opponent_tendencies"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "opponent_tendencies_lastComputedAt_idx" ON "opponent_tendencies"("lastComputedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "opponent_tendencies_leagueId_rosterId_key" ON "opponent_tendencies"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "strategy_snapshots_leagueId_idx" ON "strategy_snapshots"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "strategy_snapshots_sleeperUsername_idx" ON "strategy_snapshots"("sleeperUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "strategy_snapshots_lastComputedAt_idx" ON "strategy_snapshots"("lastComputedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "strategy_snapshots_expiresAt_idx" ON "strategy_snapshots"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "strategy_snapshots_leagueId_rosterId_season_key" ON "strategy_snapshots"("leagueId", "rosterId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_season_stats_sport_playerId_idx" ON "player_season_stats"("sport", "playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_season_stats_sport_playerId_source_seasonType_idx" ON "player_season_stats"("sport", "playerId", "source", "seasonType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_season_stats_sport_playerName_idx" ON "player_season_stats"("sport", "playerName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_season_stats_sport_position_idx" ON "player_season_stats"("sport", "position");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_season_stats_season_idx" ON "player_season_stats"("season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_season_stats_source_idx" ON "player_season_stats"("source");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "player_season_stats_sport_playerId_season_seasonType_source_key" ON "player_season_stats"("sport", "playerId", "season", "seasonType", "source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trending_players_sport_crowdSignal_idx" ON "trending_players"("sport", "crowdSignal");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trending_players_sport_crowdScore_idx" ON "trending_players"("sport", "crowdScore");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trending_players_playerName_idx" ON "trending_players"("playerName");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "trending_players_sport_sleeperId_lookbackHours_key" ON "trending_players"("sport", "sleeperId", "lookbackHours");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "depth_charts_sport_team_idx" ON "depth_charts"("sport", "team");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "depth_charts_sport_position_idx" ON "depth_charts"("sport", "position");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "depth_charts_sport_team_position_source_key" ON "depth_charts"("sport", "team", "position", "source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_season_stats_sport_team_idx" ON "team_season_stats"("sport", "team");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_season_stats_season_idx" ON "team_season_stats"("season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "team_season_stats_sport_team_season_seasonType_source_key" ON "team_season_stats"("sport", "team", "season", "seasonType", "source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProviderSyncState_provider_entityType_sport_key_idx" ON "ProviderSyncState"("provider", "entityType", "sport", "key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProviderSyncState_lastSuccessAt_idx" ON "ProviderSyncState"("lastSuccessAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProviderSyncState_lastErrorAt_idx" ON "ProviderSyncState"("lastErrorAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProviderSyncState_provider_entityType_sport_key_key" ON "ProviderSyncState"("provider", "entityType", "sport", "key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AiOutput_provider_role_taskType_idx" ON "AiOutput"("provider", "role", "taskType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AiOutput_targetType_targetId_idx" ON "AiOutput"("targetType", "targetId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AiOutput_createdAt_idx" ON "AiOutput"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guardian_interventions_userId_idx" ON "guardian_interventions"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guardian_interventions_leagueId_idx" ON "guardian_interventions"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guardian_interventions_actionType_idx" ON "guardian_interventions"("actionType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guardian_interventions_severity_idx" ON "guardian_interventions"("severity");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guardian_interventions_userDecision_idx" ON "guardian_interventions"("userDecision");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guardian_interventions_createdAt_idx" ON "guardian_interventions"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_insights_userId_idx" ON "ai_insights"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_insights_sleeperUsername_idx" ON "ai_insights"("sleeperUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_insights_insightType_idx" ON "ai_insights"("insightType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_insights_category_idx" ON "ai_insights"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_insights_isRead_idx" ON "ai_insights"("isRead");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_insights_createdAt_idx" ON "ai_insights"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_badges_userId_idx" ON "ai_badges"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_badges_sleeperUsername_idx" ON "ai_badges"("sleeperUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_badges_badgeType_idx" ON "ai_badges"("badgeType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_badges_earnedAt_idx" ON "ai_badges"("earnedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "simulation_runs_userId_idx" ON "simulation_runs"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "simulation_runs_sleeperUsername_idx" ON "simulation_runs"("sleeperUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "simulation_runs_leagueId_idx" ON "simulation_runs"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "simulation_runs_simulationType_idx" ON "simulation_runs"("simulationType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "simulation_runs_createdAt_idx" ON "simulation_runs"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_conversations_userId_idx" ON "chat_conversations"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_conversations_sleeperUsername_idx" ON "chat_conversations"("sleeperUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_conversations_lastMessageAt_idx" ON "chat_conversations"("lastMessageAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_history_conversationId_createdAt_idx" ON "chat_history"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_history_userId_createdAt_idx" ON "chat_history"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_history_leagueId_createdAt_idx" ON "chat_history"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WeeklyMatchup_leagueId_seasonYear_week_idx" ON "WeeklyMatchup"("leagueId", "seasonYear", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WeeklyMatchup_leagueId_seasonYear_rosterId_idx" ON "WeeklyMatchup"("leagueId", "seasonYear", "rosterId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyMatchup_leagueId_seasonYear_week_rosterId_key" ON "WeeklyMatchup"("leagueId", "seasonYear", "week", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rankings_snapshots_leagueId_season_week_idx" ON "rankings_snapshots"("leagueId", "season", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rankings_snapshots_leagueId_rosterId_createdAt_idx" ON "rankings_snapshots"("leagueId", "rosterId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rankings_snapshots_leagueId_sport_type_season_week_idx" ON "rankings_snapshots"("leagueId", "sport_type", "season", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rankings_snapshots_sport_type_season_week_idx" ON "rankings_snapshots"("sport_type", "season", "week");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "rankings_snapshots_leagueId_season_week_rosterId_key" ON "rankings_snapshots"("leagueId", "season", "week", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rankings_weights_snapshot_leagueId_season_week_idx" ON "rankings_weights_snapshot"("leagueId", "season", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "season_results_leagueId_season_idx" ON "season_results"("leagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "season_results_leagueId_rosterId_idx" ON "season_results"("leagueId", "rosterId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "season_results_leagueId_season_rosterId_key" ON "season_results"("leagueId", "season", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_grades_leagueId_season_idx" ON "draft_grades"("leagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_grades_leagueId_rosterId_season_idx" ON "draft_grades"("leagueId", "rosterId", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "draft_grades_leagueId_season_rosterId_key" ON "draft_grades"("leagueId", "season", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hall_of_fame_leagueId_score_idx" ON "hall_of_fame"("leagueId", "score");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "hall_of_fame_leagueId_rosterId_key" ON "hall_of_fame"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hall_of_fame_entries_sport_category_idx" ON "hall_of_fame_entries"("sport", "category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hall_of_fame_entries_leagueId_entityType_idx" ON "hall_of_fame_entries"("leagueId", "entityType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hall_of_fame_entries_entityType_entityId_idx" ON "hall_of_fame_entries"("entityType", "entityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hall_of_fame_entries_inductedAt_idx" ON "hall_of_fame_entries"("inductedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hall_of_fame_moments_leagueId_season_idx" ON "hall_of_fame_moments"("leagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hall_of_fame_moments_sport_season_idx" ON "hall_of_fame_moments"("sport", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hall_of_fame_moments_createdAt_idx" ON "hall_of_fame_moments"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "legacy_score_records_sport_leagueId_idx" ON "legacy_score_records"("sport", "leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "legacy_score_records_entityType_entityId_idx" ON "legacy_score_records"("entityType", "entityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "legacy_score_records_overallLegacyScore_idx" ON "legacy_score_records"("overallLegacyScore");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "legacy_score_records_entityType_entityId_sport_leagueId_key" ON "legacy_score_records"("entityType", "entityId", "sport", "leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "legacy_evidence_records_entityType_entityId_sport_idx" ON "legacy_evidence_records"("entityType", "entityId", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "legacy_evidence_records_sport_evidenceType_idx" ON "legacy_evidence_records"("sport", "evidenceType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApiUsageEvent_ts_idx" ON "ApiUsageEvent"("ts");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApiUsageEvent_scope_ts_idx" ON "ApiUsageEvent"("scope", "ts");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApiUsageEvent_endpoint_ts_idx" ON "ApiUsageEvent"("endpoint", "ts");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApiUsageEvent_tool_ts_idx" ON "ApiUsageEvent"("tool", "ts");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApiUsageEvent_leagueId_ts_idx" ON "ApiUsageEvent"("leagueId", "ts");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApiUsageEvent_userId_ts_idx" ON "ApiUsageEvent"("userId", "ts");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApiUsageRollup_bucketType_bucketStart_idx" ON "ApiUsageRollup"("bucketType", "bucketStart");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApiUsageRollup_scope_bucketType_bucketStart_idx" ON "ApiUsageRollup"("scope", "bucketType", "bucketStart");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApiUsageRollup_endpoint_bucketType_bucketStart_idx" ON "ApiUsageRollup"("endpoint", "bucketType", "bucketStart");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApiUsageRollup_tool_bucketType_bucketStart_idx" ON "ApiUsageRollup"("tool", "bucketType", "bucketStart");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApiUsageRollup_leagueId_bucketType_bucketStart_idx" ON "ApiUsageRollup"("leagueId", "bucketType", "bucketStart");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ApiUsageRollup_bucketType_bucketStart_scope_tool_endpoint_l_key" ON "ApiUsageRollup"("bucketType", "bucketStart", "scope", "tool", "endpoint", "leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Player_league_idx" ON "Player"("league");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Player_devyEligible_idx" ON "Player"("devyEligible");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DevyPlayer_devyEligible_idx" ON "DevyPlayer"("devyEligible");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DevyPlayer_league_idx" ON "DevyPlayer"("league");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DevyPlayer_sport_idx" ON "DevyPlayer"("sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DevyPlayer_position_idx" ON "DevyPlayer"("position");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DevyPlayer_draftEligibleYear_idx" ON "DevyPlayer"("draftEligibleYear");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DevyPlayer_sport_draftEligibleYear_idx" ON "DevyPlayer"("sport", "draftEligibleYear");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DevyPlayer_graduatedToNFL_idx" ON "DevyPlayer"("graduatedToNFL");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DevyPlayer_cfbdId_idx" ON "DevyPlayer"("cfbdId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DevyPlayer_draftStatus_idx" ON "DevyPlayer"("draftStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DevyPlayer_draftProjectionScore_idx" ON "DevyPlayer"("draftProjectionScore");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DevyPlayer_portalStatus_idx" ON "DevyPlayer"("portalStatus");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DevyPlayer_normalizedName_position_school_key" ON "DevyPlayer"("normalizedName", "position", "school");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DevyAdp_playerId_idx" ON "DevyAdp"("playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DevyAdp_season_idx" ON "DevyAdp"("season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DevyAdp_playerId_source_season_key" ON "DevyAdp"("playerId", "source", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeOutcomeTraining_leagueId_createdAt_idx" ON "TradeOutcomeTraining"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeOutcomeTraining_wasAccepted_idx" ON "TradeOutcomeTraining"("wasAccepted");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeShare_expiresAt_idx" ON "TradeShare"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TradeShare_userId_createdAt_idx" ON "TradeShare"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EngineSnapshot_leagueId_type_idx" ON "EngineSnapshot"("leagueId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EngineSnapshot_expiresAt_idx" ON "EngineSnapshot"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EngineSnapshot_leagueId_type_hash_key" ON "EngineSnapshot"("leagueId", "type", "hash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerAnalyticsSnapshot_normalizedName_idx" ON "PlayerAnalyticsSnapshot"("normalizedName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerAnalyticsSnapshot_position_idx" ON "PlayerAnalyticsSnapshot"("position");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerAnalyticsSnapshot_season_idx" ON "PlayerAnalyticsSnapshot"("season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerAnalyticsSnapshot_status_idx" ON "PlayerAnalyticsSnapshot"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerAnalyticsSnapshot_currentTeam_idx" ON "PlayerAnalyticsSnapshot"("currentTeam");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PlayerAnalyticsSnapshot_normalizedName_season_source_key" ON "PlayerAnalyticsSnapshot"("normalizedName", "season", "source");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "app_users_email_key" ON "app_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "app_users_username_key" ON "app_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "app_users_legacyUserId_key" ON "app_users"("legacyUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "growth_attributions_source_idx" ON "growth_attributions"("source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "growth_attributions_source_sourceId_idx" ON "growth_attributions"("source", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "growth_attributions_userId_key" ON "growth_attributions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "invite_links_token_key" ON "invite_links"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invite_links_createdByUserId_idx" ON "invite_links"("createdByUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invite_links_createdByUserId_type_createdAt_idx" ON "invite_links"("createdByUserId", "type", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invite_links_type_idx" ON "invite_links"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invite_links_type_targetId_idx" ON "invite_links"("type", "targetId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invite_links_status_idx" ON "invite_links"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invite_links_status_expiresAt_idx" ON "invite_links"("status", "expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invite_links_token_idx" ON "invite_links"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invite_link_events_inviteLinkId_createdAt_idx" ON "invite_link_events"("inviteLinkId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invite_link_events_inviteLinkId_eventType_createdAt_idx" ON "invite_link_events"("inviteLinkId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invite_link_events_eventType_idx" ON "invite_link_events"("eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invite_link_events_channel_createdAt_idx" ON "invite_link_events"("channel", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "creator_profiles_userId_key" ON "creator_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "creator_profiles_handle_key" ON "creator_profiles"("handle");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "creator_profiles_slug_key" ON "creator_profiles"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_profiles_handle_idx" ON "creator_profiles"("handle");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_profiles_slug_idx" ON "creator_profiles"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_profiles_visibility_idx" ON "creator_profiles"("visibility");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_profiles_featuredRank_idx" ON "creator_profiles"("featuredRank");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "creator_leagues_inviteCode_key" ON "creator_leagues"("inviteCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_leagues_creatorId_idx" ON "creator_leagues"("creatorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_leagues_inviteCode_idx" ON "creator_leagues"("inviteCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_leagues_sport_idx" ON "creator_leagues"("sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_leagues_isPublic_idx" ON "creator_leagues"("isPublic");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "creator_leagues_creatorId_slug_key" ON "creator_leagues"("creatorId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "creator_invites_code_key" ON "creator_invites"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_invites_creatorId_idx" ON "creator_invites"("creatorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_invites_code_idx" ON "creator_invites"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_invites_creatorLeagueId_createdAt_idx" ON "creator_invites"("creatorLeagueId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_league_members_userId_idx" ON "creator_league_members"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_league_members_creatorLeagueId_joinedAt_idx" ON "creator_league_members"("creatorLeagueId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "creator_league_members_creatorLeagueId_userId_key" ON "creator_league_members"("creatorLeagueId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_analytics_events_creatorId_createdAt_idx" ON "creator_analytics_events"("creatorId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_analytics_events_creatorId_eventType_createdAt_idx" ON "creator_analytics_events"("creatorId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_analytics_events_eventType_idx" ON "creator_analytics_events"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referral_codes_userId_idx" ON "referral_codes"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referral_codes_userId_status_idx" ON "referral_codes"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "referrals_referredUserId_key" ON "referrals"("referredUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referrals_referrerId_idx" ON "referrals"("referrerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referrals_referrerId_kind_status_idx" ON "referrals"("referrerId", "kind", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referrals_referralCodeId_idx" ON "referrals"("referralCodeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referrals_signupCompletedAt_idx" ON "referrals"("signupCompletedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referrals_onboardingCompletedAt_idx" ON "referrals"("onboardingCompletedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referral_events_referrerId_idx" ON "referral_events"("referrerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referral_events_referrerId_type_idx" ON "referral_events"("referrerId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referral_events_referredUserId_idx" ON "referral_events"("referredUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referral_events_referralId_type_createdAt_idx" ON "referral_events"("referralId", "type", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referral_events_codeId_type_createdAt_idx" ON "referral_events"("codeId", "type", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referral_events_channel_createdAt_idx" ON "referral_events"("channel", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "referral_reward_rules_key_key" ON "referral_reward_rules"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referral_reward_rules_triggerType_isActive_idx" ON "referral_reward_rules"("triggerType", "isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referral_reward_rules_audience_isActive_idx" ON "referral_reward_rules"("audience", "isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referral_rewards_userId_idx" ON "referral_rewards"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referral_rewards_userId_status_idx" ON "referral_rewards"("userId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referral_rewards_referralId_idx" ON "referral_rewards"("referralId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referral_rewards_rewardRuleId_idx" ON "referral_rewards"("rewardRuleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referral_rewards_type_status_idx" ON "referral_rewards"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "auth_accounts_provider_providerAccountId_key" ON "auth_accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "auth_sessions_sessionToken_key" ON "auth_sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "auth_verification_tokens_token_key" ON "auth_verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "auth_verification_tokens_identifier_token_key" ON "auth_verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BracketTournament_sport_season_key" ON "BracketTournament"("sport", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BracketNode_sportsGameId_key" ON "BracketNode"("sportsGameId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BracketNode_tournamentId_round_region_idx" ON "BracketNode"("tournamentId", "round", "region");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BracketNode_tournamentId_slot_key" ON "BracketNode"("tournamentId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BracketLeague_joinCode_key" ON "BracketLeague"("joinCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BracketLeague_tournamentId_idx" ON "BracketLeague"("tournamentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BracketLeague_ownerId_idx" ON "BracketLeague"("ownerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BracketLeagueMember_userId_idx" ON "BracketLeagueMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BracketLeagueMember_leagueId_userId_key" ON "BracketLeagueMember"("leagueId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BracketEntry_leagueId_idx" ON "BracketEntry"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BracketEntry_userId_idx" ON "BracketEntry"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BracketEntrySnapshot_tournamentId_leagueId_idx" ON "BracketEntrySnapshot"("tournamentId", "leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BracketEntrySnapshot_entryId_createdAt_idx" ON "BracketEntrySnapshot"("entryId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bracket_pick_popularity_tournamentId_leagueId_nodeId_idx" ON "bracket_pick_popularity"("tournamentId", "leagueId", "nodeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bracket_pick_popularity_tournamentId_leagueId_nodeId_teamNa_key" ON "bracket_pick_popularity"("tournamentId", "leagueId", "nodeId", "teamName", "scope");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bracket_simulation_snapshot_leagueId_entryId_idx" ON "bracket_simulation_snapshot"("leagueId", "entryId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bracket_simulation_snapshot_tournamentId_leagueId_entryId_key" ON "bracket_simulation_snapshot"("tournamentId", "leagueId", "entryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bracket_leaderboards_tournamentId_leagueId_rank_idx" ON "bracket_leaderboards"("tournamentId", "leagueId", "rank");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bracket_leaderboards_tournamentId_leagueId_score_entryId_idx" ON "bracket_leaderboards"("tournamentId", "leagueId", "score", "entryId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bracket_leaderboards_tournamentId_leagueId_entryId_key" ON "bracket_leaderboards"("tournamentId", "leagueId", "entryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bracket_health_snapshots_leagueId_entryId_idx" ON "bracket_health_snapshots"("leagueId", "entryId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bracket_health_snapshots_tournamentId_leagueId_entryId_key" ON "bracket_health_snapshots"("tournamentId", "leagueId", "entryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BracketPick_nodeId_idx" ON "BracketPick"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BracketPick_entryId_nodeId_key" ON "BracketPick"("entryId", "nodeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bracket_league_messages_leagueId_createdAt_idx" ON "bracket_league_messages"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bracket_league_messages_userId_idx" ON "bracket_league_messages"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bracket_message_reactions_messageId_idx" ON "bracket_message_reactions"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bracket_message_reactions_messageId_userId_emoji_key" ON "bracket_message_reactions"("messageId", "userId", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BracketPayment_stripeSessionId_key" ON "BracketPayment"("stripeSessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BracketPayment_userId_leagueId_tournamentId_idx" ON "BracketPayment"("userId", "leagueId", "tournamentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BracketPayment_stripeSessionId_idx" ON "BracketPayment"("stripeSessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bracket_feed_events_tournamentId_createdAt_idx" ON "bracket_feed_events"("tournamentId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bracket_feed_events_leagueId_createdAt_idx" ON "bracket_feed_events"("leagueId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bracket_risk_profiles_userId_key" ON "bracket_risk_profiles"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "simulation_results_createdByUserId_idx" ON "simulation_results"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "simulation_results_bracketId_tournamentId_key" ON "simulation_results"("bracketId", "tournamentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bracket_challenges_leagueId_idx" ON "bracket_challenges"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bracket_challenges_leagueId_challengerEntryId_challengedEnt_key" ON "bracket_challenges"("leagueId", "challengerEntryId", "challengedEntryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_follows_followeeId_idx" ON "user_follows"("followeeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_follows_followerId_followeeId_key" ON "user_follows"("followerId", "followeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "activity_events_leagueId_createdAt_idx" ON "activity_events"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "activity_events_userId_createdAt_idx" ON "activity_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reaction_events_leagueId_createdAt_idx" ON "reaction_events"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reaction_events_userId_createdAt_idx" ON "reaction_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_rivalries_userBId_idx" ON "user_rivalries"("userBId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_rivalries_userAId_userBId_key" ON "user_rivalries"("userAId", "userBId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rivalry_records_leagueId_sport_idx" ON "rivalry_records"("leagueId", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rivalry_records_leagueId_rivalryTier_idx" ON "rivalry_records"("leagueId", "rivalryTier");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rivalry_records_managerAId_managerBId_idx" ON "rivalry_records"("managerAId", "managerBId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "rivalry_records_leagueId_managerAId_managerBId_key" ON "rivalry_records"("leagueId", "managerAId", "managerBId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rivalry_events_rivalryId_idx" ON "rivalry_events"("rivalryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rivalry_events_eventType_season_idx" ON "rivalry_events"("eventType", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "manager_psych_profiles_leagueId_sport_idx" ON "manager_psych_profiles"("leagueId", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "manager_psych_profiles_managerId_idx" ON "manager_psych_profiles"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "manager_psych_profiles_leagueId_managerId_key" ON "manager_psych_profiles"("leagueId", "managerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "profile_evidence_records_managerId_leagueId_idx" ON "profile_evidence_records"("managerId", "leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "profile_evidence_records_evidenceType_sport_idx" ON "profile_evidence_records"("evidenceType", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "drama_events_leagueId_sport_idx" ON "drama_events"("leagueId", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "drama_events_leagueId_season_idx" ON "drama_events"("leagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "drama_events_dramaType_season_idx" ON "drama_events"("dramaType", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "drama_timeline_records_leagueId_idx" ON "drama_timeline_records"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "drama_timeline_records_leagueId_sport_season_key" ON "drama_timeline_records"("leagueId", "sport", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "manager_reputation_records_leagueId_sport_season_idx" ON "manager_reputation_records"("leagueId", "sport", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "manager_reputation_records_managerId_idx" ON "manager_reputation_records"("managerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "manager_reputation_records_tier_idx" ON "manager_reputation_records"("tier");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "manager_reputation_records_leagueId_managerId_sport_season_key" ON "manager_reputation_records"("leagueId", "managerId", "sport", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reputation_evidence_records_managerId_leagueId_season_idx" ON "reputation_evidence_records"("managerId", "leagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reputation_evidence_records_leagueId_evidenceType_idx" ON "reputation_evidence_records"("leagueId", "evidenceType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reputation_evidence_records_sport_season_evidenceType_idx" ON "reputation_evidence_records"("sport", "season", "evidenceType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reputation_config_records_leagueId_sport_idx" ON "reputation_config_records"("leagueId", "sport");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "reputation_config_records_leagueId_sport_season_key" ON "reputation_config_records"("leagueId", "sport", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "manager_franchise_profiles_gmPrestigeScore_idx" ON "manager_franchise_profiles"("gmPrestigeScore");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "manager_franchise_profiles_franchiseValue_idx" ON "manager_franchise_profiles"("franchiseValue");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "manager_franchise_profiles_managerId_key" ON "manager_franchise_profiles"("managerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gm_progression_events_managerId_idx" ON "gm_progression_events"("managerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gm_progression_events_managerId_sport_idx" ON "gm_progression_events"("managerId", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gm_progression_events_eventType_createdAt_idx" ON "gm_progression_events"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "manager_xp_profiles_totalXP_idx" ON "manager_xp_profiles"("totalXP");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "manager_xp_profiles_currentTier_idx" ON "manager_xp_profiles"("currentTier");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "manager_xp_profiles_managerId_key" ON "manager_xp_profiles"("managerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "xp_events_managerId_idx" ON "xp_events"("managerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "xp_events_managerId_sport_idx" ON "xp_events"("managerId", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "xp_events_eventType_createdAt_idx" ON "xp_events"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "award_records_leagueId_season_idx" ON "award_records"("leagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "award_records_leagueId_season_awardType_idx" ON "award_records"("leagueId", "season", "awardType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "award_records_managerId_idx" ON "award_records"("managerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "record_book_entries_leagueId_recordType_idx" ON "record_book_entries"("leagueId", "recordType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "record_book_entries_sport_recordType_idx" ON "record_book_entries"("sport", "recordType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "record_book_entries_holderId_idx" ON "record_book_entries"("holderId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "record_book_entries_leagueId_recordType_season_key" ON "record_book_entries"("leagueId", "recordType", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "manager_wallets_managerId_key" ON "manager_wallets"("managerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "marketplace_items_cosmeticCategory_idx" ON "marketplace_items"("cosmeticCategory");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "marketplace_items_sportRestriction_idx" ON "marketplace_items"("sportRestriction");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_records_managerId_idx" ON "purchase_records"("managerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_records_itemId_idx" ON "purchase_records"("itemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "media_articles_leagueId_idx" ON "media_articles"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "media_articles_leagueId_sport_idx" ON "media_articles"("leagueId", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "media_articles_createdAt_idx" ON "media_articles"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "blog_articles_slug_key" ON "blog_articles"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blog_articles_publishStatus_idx" ON "blog_articles"("publishStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blog_articles_sport_idx" ON "blog_articles"("sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blog_articles_category_idx" ON "blog_articles"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blog_articles_publishedAt_idx" ON "blog_articles"("publishedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blog_articles_createdAt_idx" ON "blog_articles"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "blog_drafts_articleId_key" ON "blog_drafts"("articleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blog_drafts_draftStatus_idx" ON "blog_drafts"("draftStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blog_drafts_sport_idx" ON "blog_drafts"("sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blog_drafts_category_idx" ON "blog_drafts"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blog_drafts_updatedAt_idx" ON "blog_drafts"("updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blog_publish_logs_articleId_idx" ON "blog_publish_logs"("articleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blog_publish_logs_createdAt_idx" ON "blog_publish_logs"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "broadcast_sessions_leagueId_idx" ON "broadcast_sessions"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "broadcast_sessions_startedAt_idx" ON "broadcast_sessions"("startedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "commentary_entries_leagueId_idx" ON "commentary_entries"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "commentary_entries_leagueId_eventType_idx" ON "commentary_entries"("leagueId", "eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "commentary_entries_createdAt_idx" ON "commentary_entries"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_phone_key" ON "user_profiles"("phone");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_sleeperUserId_key" ON "user_profiles"("sleeperUserId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_discordUserId_key" ON "user_profiles"("discordUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_profiles_sleeperUsername_idx" ON "user_profiles"("sleeperUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_profiles_phone_idx" ON "user_profiles"("phone");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "discord_guild_links_guildId_key" ON "discord_guild_links"("guildId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "discord_guild_links_linkedByUserId_idx" ON "discord_guild_links"("linkedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "discord_league_channels_channelId_key" ON "discord_league_channels"("channelId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "discord_league_channels_leagueId_idx" ON "discord_league_channels"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "discord_league_channels_guildId_idx" ON "discord_league_channels"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "discord_league_channels_leagueId_guildId_key" ON "discord_league_channels"("leagueId", "guildId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "discord_message_links_leagueMessageId_idx" ON "discord_message_links"("leagueMessageId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "discord_message_links_discordMessageId_idx" ON "discord_message_links"("discordMessageId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "email_verify_tokens_tokenHash_key" ON "email_verify_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "email_verify_tokens_userId_idx" ON "email_verify_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "leagues_legacyLeagueId_key" ON "leagues"("legacyLeagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leagues_userId_idx" ON "leagues"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leagues_userId_updatedAt_idx" ON "leagues"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leagues_userId_isDynasty_idx" ON "leagues"("userId", "isDynasty");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leagues_sport_season_idx" ON "leagues"("sport", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leagues_status_idx" ON "leagues"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leagues_importBatchId_idx" ON "leagues"("importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "leagues_userId_platform_platformLeagueId_season_key" ON "leagues"("userId", "platform", "platformLeagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "integrity_flags_leagueId_status_idx" ON "integrity_flags"("leagueId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "integrity_flags_leagueId_flagType_idx" ON "integrity_flags"("leagueId", "flagType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "integrity_flags_createdAt_idx" ON "integrity_flags"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "league_integrity_settings_leagueId_key" ON "league_integrity_settings"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "auto_coach_settings_userId_idx" ON "auto_coach_settings"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "auto_coach_settings_leagueId_idx" ON "auto_coach_settings"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "auto_coach_settings_userId_leagueId_key" ON "auto_coach_settings"("userId", "leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "auto_coach_swap_logs_userId_leagueId_idx" ON "auto_coach_swap_logs"("userId", "leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "auto_coach_swap_logs_leagueId_idx" ON "auto_coach_swap_logs"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "auto_coach_swap_logs_swapMadeAt_idx" ON "auto_coach_swap_logs"("swapMadeAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_status_events_externalId_detectedAt_idx" ON "player_status_events"("externalId", "detectedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_status_events_sport_gameDate_idx" ON "player_status_events"("sport", "gameDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_status_events_detectedAt_idx" ON "player_status_events"("detectedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_status_events_autoCoachTriggered_idx" ON "player_status_events"("autoCoachTriggered");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "league_settings_leagueId_key" ON "league_settings"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_seasons_leagueId_idx" ON "league_seasons"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "league_seasons_leagueId_season_key" ON "league_seasons"("leagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_storylines_leagueId_season_week_idx" ON "league_storylines"("leagueId", "season", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_storylines_leagueId_storyType_createdAt_idx" ON "league_storylines"("leagueId", "storyType", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_matchup_previews_leagueId_season_week_idx" ON "league_matchup_previews"("leagueId", "season", "week");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "league_matchup_previews_leagueId_season_week_rosterAId_rost_key" ON "league_matchup_previews"("leagueId", "season", "week", "rosterAId", "rosterBId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_recaps_leagueId_createdAt_idx" ON "draft_recaps"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_recaps_draftSessionId_idx" ON "draft_recaps"("draftSessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "keeper_declarations_leagueId_season_status_idx" ON "keeper_declarations"("leagueId", "season", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "keeper_declarations_rosterId_season_idx" ON "keeper_declarations"("rosterId", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "keeper_declarations_leagueId_rosterId_season_playerId_key" ON "keeper_declarations"("leagueId", "rosterId", "season", "playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "scoring_settings_snapshots_leagueId_season_week_idx" ON "scoring_settings_snapshots"("leagueId", "season", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "scoring_settings_snapshots_leagueId_createdAt_idx" ON "scoring_settings_snapshots"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_intro_views_userId_seenAt_idx" ON "league_intro_views"("userId", "seenAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "league_intro_views_leagueId_userId_key" ON "league_intro_views"("leagueId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_templates_userId_idx" ON "league_templates"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournaments_creatorId_idx" ON "tournaments"("creatorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournaments_sport_season_idx" ON "tournaments"("sport", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournaments_status_idx" ON "tournaments"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_conferences_tournamentId_idx" ON "tournament_conferences"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_leagues_leagueId_key" ON "tournament_leagues"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_leagues_tournamentId_idx" ON "tournament_leagues"("tournamentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_leagues_conferenceId_idx" ON "tournament_leagues"("conferenceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_rounds_tournamentId_idx" ON "tournament_rounds"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_rounds_tournamentId_roundIndex_key" ON "tournament_rounds"("tournamentId", "roundIndex");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_announcements_tournamentId_idx" ON "tournament_announcements"("tournamentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_announcements_tournamentId_createdAt_idx" ON "tournament_announcements"("tournamentId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_audit_logs_tournamentId_idx" ON "tournament_audit_logs"("tournamentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_audit_logs_tournamentId_createdAt_idx" ON "tournament_audit_logs"("tournamentId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_participants_tournamentId_idx" ON "tournament_participants"("tournamentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_participants_conferenceId_idx" ON "tournament_participants"("conferenceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_participants_tournamentId_status_idx" ON "tournament_participants"("tournamentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_participants_tournamentId_userId_key" ON "tournament_participants"("tournamentId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_shells_status_idx" ON "tournament_shells"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_shells_commissionerId_idx" ON "tournament_shells"("commissionerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_shell_conferences_tournamentId_idx" ON "tournament_shell_conferences"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_shell_conferences_tournamentId_conferenceNumber_key" ON "tournament_shell_conferences"("tournamentId", "conferenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_shell_conferences_tournamentId_slug_key" ON "tournament_shell_conferences"("tournamentId", "slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_shell_rounds_tournamentId_idx" ON "tournament_shell_rounds"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_shell_rounds_tournamentId_roundNumber_key" ON "tournament_shell_rounds"("tournamentId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_shell_leagues_leagueId_key" ON "tournament_shell_leagues"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_shell_leagues_tournamentId_roundId_idx" ON "tournament_shell_leagues"("tournamentId", "roundId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_shell_leagues_conferenceId_idx" ON "tournament_shell_leagues"("conferenceId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_shell_leagues_tournamentId_name_key" ON "tournament_shell_leagues"("tournamentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_shell_leagues_tournamentId_slug_key" ON "tournament_shell_leagues"("tournamentId", "slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_shell_participants_tournamentId_status_idx" ON "tournament_shell_participants"("tournamentId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_shell_participants_userId_idx" ON "tournament_shell_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_shell_participants_tournamentId_userId_key" ON "tournament_shell_participants"("tournamentId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_shell_league_participants_tournamentLeagueId_idx" ON "tournament_shell_league_participants"("tournamentLeagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_shell_league_participants_participantId_idx" ON "tournament_shell_league_participants"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_shell_league_participants_tournamentLeagueId_par_key" ON "tournament_shell_league_participants"("tournamentLeagueId", "participantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_shell_advancement_groups_tournamentId_idx" ON "tournament_shell_advancement_groups"("tournamentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_shell_advancement_groups_conferenceId_idx" ON "tournament_shell_advancement_groups"("conferenceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_shell_name_records_tournamentId_entityType_idx" ON "tournament_shell_name_records"("tournamentId", "entityType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_shell_announcements_tournamentId_type_idx" ON "tournament_shell_announcements"("tournamentId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournament_shell_audit_logs_tournamentId_action_idx" ON "tournament_shell_audit_logs"("tournamentId", "action");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "chat_gifs_giphyId_key" ON "chat_gifs"("giphyId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "chat_emojis_char_key" ON "chat_emojis"("char");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "chat_emojis_shortcode_key" ON "chat_emojis"("shortcode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_emojis_category_idx" ON "chat_emojis"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_chat_messages_leagueId_idx" ON "league_chat_messages"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_chat_messages_leagueId_source_idx" ON "league_chat_messages"("leagueId", "source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_chat_messages_createdAt_idx" ON "league_chat_messages"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_chat_messages_globalBroadcastId_idx" ON "league_chat_messages"("globalBroadcastId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "supplemental_drafts_leagueId_idx" ON "supplemental_drafts"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "supplemental_drafts_status_idx" ON "supplemental_drafts"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "supplemental_draft_picks_supplementalDraftId_rosterId_idx" ON "supplemental_draft_picks"("supplementalDraftId", "rosterId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "supplemental_draft_picks_supplementalDraftId_pickNumber_key" ON "supplemental_draft_picks"("supplementalDraftId", "pickNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ai_commissioner_configs_leagueId_key" ON "ai_commissioner_configs"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_commissioner_configs_leagueId_sport_idx" ON "ai_commissioner_configs"("leagueId", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_commissioner_alerts_leagueId_createdAt_idx" ON "ai_commissioner_alerts"("leagueId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_commissioner_alerts_leagueId_status_createdAt_idx" ON "ai_commissioner_alerts"("leagueId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_commissioner_alerts_leagueId_alertType_idx" ON "ai_commissioner_alerts"("leagueId", "alertType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_commissioner_action_logs_leagueId_createdAt_idx" ON "ai_commissioner_action_logs"("leagueId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_commissioner_action_logs_leagueId_actionType_idx" ON "ai_commissioner_action_logs"("leagueId", "actionType");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LeagueInvite_token_key" ON "LeagueInvite"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeagueInvite_token_idx" ON "LeagueInvite"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeagueInvite_leagueId_idx" ON "LeagueInvite"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LeagueManagerClaim_leagueId_afUserId_key" ON "LeagueManagerClaim"("leagueId", "afUserId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LeagueManagerClaim_leagueId_teamExternalId_key" ON "LeagueManagerClaim"("leagueId", "teamExternalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "find_league_listings_isActive_sport_createdAt_idx" ON "find_league_listings"("isActive", "sport", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "find_league_listings_leagueId_rosterId_key" ON "find_league_listings"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rosters_leagueId_idx" ON "rosters"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rosters_platformUserId_idx" ON "rosters"("platformUserId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "rosters_leagueId_platformUserId_key" ON "rosters"("leagueId", "platformUserId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "league_teams_legacyRosterId_key" ON "league_teams"("legacyRosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_teams_leagueId_pointsFor_idx" ON "league_teams"("leagueId", "pointsFor");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_teams_divisionId_idx" ON "league_teams"("divisionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_teams_aiPowerScore_idx" ON "league_teams"("aiPowerScore");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "league_teams_leagueId_externalId_key" ON "league_teams"("leagueId", "externalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_divisions_leagueId_idx" ON "league_divisions"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "league_divisions_leagueId_tierLevel_key" ON "league_divisions"("leagueId", "tierLevel");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "promotion_rules_leagueId_idx" ON "promotion_rules"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "promotion_rules_leagueId_fromTierLevel_toTierLevel_key" ON "promotion_rules"("leagueId", "fromTierLevel", "toTierLevel");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_performances_teamId_season_idx" ON "team_performances"("teamId", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "team_performances_teamId_season_week_key" ON "team_performances"("teamId", "season", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_auths_userId_idx" ON "league_auths"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "league_auths_userId_platform_key" ON "league_auths"("userId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "league_waiver_settings_leagueId_key" ON "league_waiver_settings"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "guillotine_league_configs_leagueId_key" ON "guillotine_league_configs"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guillotine_roster_states_leagueId_idx" ON "guillotine_roster_states"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guillotine_roster_states_leagueId_choppedInPeriod_idx" ON "guillotine_roster_states"("leagueId", "choppedInPeriod");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "guillotine_roster_states_rosterId_key" ON "guillotine_roster_states"("rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guillotine_period_scores_leagueId_weekOrPeriod_idx" ON "guillotine_period_scores"("leagueId", "weekOrPeriod");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guillotine_period_scores_leagueId_rosterId_idx" ON "guillotine_period_scores"("leagueId", "rosterId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "guillotine_period_scores_leagueId_rosterId_weekOrPeriod_key" ON "guillotine_period_scores"("leagueId", "rosterId", "weekOrPeriod");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guillotine_event_logs_leagueId_idx" ON "guillotine_event_logs"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guillotine_event_logs_leagueId_eventType_idx" ON "guillotine_event_logs"("leagueId", "eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guillotine_event_logs_createdAt_idx" ON "guillotine_event_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "salary_cap_league_configs_leagueId_key" ON "salary_cap_league_configs"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "salary_cap_team_ledgers_leagueId_capYear_idx" ON "salary_cap_team_ledgers"("leagueId", "capYear");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "salary_cap_team_ledgers_rosterId_capYear_idx" ON "salary_cap_team_ledgers"("rosterId", "capYear");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "salary_cap_team_ledgers_configId_rosterId_capYear_key" ON "salary_cap_team_ledgers"("configId", "rosterId", "capYear");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_contracts_leagueId_rosterId_idx" ON "player_contracts"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_contracts_leagueId_playerId_idx" ON "player_contracts"("leagueId", "playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_contracts_configId_yearSigned_idx" ON "player_contracts"("configId", "yearSigned");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_contracts_rosterId_status_idx" ON "player_contracts"("rosterId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "salary_cap_event_logs_leagueId_eventType_idx" ON "salary_cap_event_logs"("leagueId", "eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "salary_cap_event_logs_createdAt_idx" ON "salary_cap_event_logs"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "salary_cap_lottery_results_leagueId_capYear_idx" ON "salary_cap_lottery_results"("leagueId", "capYear");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "salary_cap_lottery_results_configId_capYear_key" ON "salary_cap_lottery_results"("configId", "capYear");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_league_configs_leagueId_key" ON "survivor_league_configs"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_tribes_leagueId_idx" ON "survivor_tribes"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_tribes_configId_slotIndex_key" ON "survivor_tribes"("configId", "slotIndex");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_tribe_members_rosterId_idx" ON "survivor_tribe_members"("rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_tribe_members_tribeId_idx" ON "survivor_tribe_members"("tribeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_tribe_members_tribeId_rosterId_key" ON "survivor_tribe_members"("tribeId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_idols_leagueId_rosterId_idx" ON "survivor_idols"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_idols_leagueId_playerId_idx" ON "survivor_idols"("leagueId", "playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_idols_configId_status_idx" ON "survivor_idols"("configId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_idols_leagueId_currentOwnerUserId_idx" ON "survivor_idols"("leagueId", "currentOwnerUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_idols_leagueId_powerType_idx" ON "survivor_idols"("leagueId", "powerType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_idol_ledger_entries_leagueId_eventType_idx" ON "survivor_idol_ledger_entries"("leagueId", "eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_idol_ledger_entries_idolId_idx" ON "survivor_idol_ledger_entries"("idolId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_tribal_councils_leagueId_week_idx" ON "survivor_tribal_councils"("leagueId", "week");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_tribal_councils_configId_week_councilNumber_key" ON "survivor_tribal_councils"("configId", "week", "councilNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_votes_councilId_idx" ON "survivor_votes"("councilId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_votes_voterUserId_idx" ON "survivor_votes"("voterUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_votes_leagueId_idx" ON "survivor_votes"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_votes_councilId_voterRosterId_key" ON "survivor_votes"("councilId", "voterRosterId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_exile_leagues_mainLeagueId_key" ON "survivor_exile_leagues"("mainLeagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_exile_leagues_configId_key" ON "survivor_exile_leagues"("configId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_exile_leagues_exileLeagueId_idx" ON "survivor_exile_leagues"("exileLeagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_exile_tokens_exileLeagueId_idx" ON "survivor_exile_tokens"("exileLeagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_exile_tokens_exileLeagueId_rosterId_key" ON "survivor_exile_tokens"("exileLeagueId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_jury_members_leagueId_idx" ON "survivor_jury_members"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_jury_members_leagueId_rosterId_key" ON "survivor_jury_members"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_audit_logs_leagueId_eventType_idx" ON "survivor_audit_logs"("leagueId", "eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_audit_logs_createdAt_idx" ON "survivor_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_challenges_leagueId_week_idx" ON "survivor_challenges"("leagueId", "week");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_challenges_configId_week_challengeNumber_challenge_key" ON "survivor_challenges"("configId", "week", "challengeNumber", "challengeType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_challenge_submissions_challengeId_idx" ON "survivor_challenge_submissions"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_challenge_submissions_challengeId_rosterId_key" ON "survivor_challenge_submissions"("challengeId", "rosterId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_challenge_submissions_challengeId_tribeId_key" ON "survivor_challenge_submissions"("challengeId", "tribeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_challenge_submissions_challengeId_userId_key" ON "survivor_challenge_submissions"("challengeId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_tribe_chat_members_tribeId_idx" ON "survivor_tribe_chat_members"("tribeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_tribe_chat_members_tribeId_rosterId_key" ON "survivor_tribe_chat_members"("tribeId", "rosterId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_tribe_chat_members_tribeId_userId_key" ON "survivor_tribe_chat_members"("tribeId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_players_leagueId_playerState_idx" ON "survivor_players"("leagueId", "playerState");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_players_tribeId_idx" ON "survivor_players"("tribeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_players_leagueId_userId_key" ON "survivor_players"("leagueId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_jury_sessions_leagueId_key" ON "survivor_jury_sessions"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_jury_votes_sessionId_idx" ON "survivor_jury_votes"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_jury_votes_sessionId_jurorUserId_key" ON "survivor_jury_votes"("sessionId", "jurorUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_host_messages_leagueId_channelType_idx" ON "survivor_host_messages"("leagueId", "channelType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_chat_channels_leagueId_channelType_idx" ON "survivor_chat_channels"("leagueId", "channelType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_tribe_swaps_leagueId_idx" ON "survivor_tribe_swaps"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_token_pool_picks_leagueId_userId_week_idx" ON "survivor_token_pool_picks"("leagueId", "userId", "week");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_exile_islands_leagueId_key" ON "survivor_exile_islands"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_exile_islands_leagueId_idx" ON "survivor_exile_islands"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_exile_weekly_entries_exileId_week_idx" ON "survivor_exile_weekly_entries"("exileId", "week");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_exile_weekly_entries_exileId_userId_week_key" ON "survivor_exile_weekly_entries"("exileId", "userId", "week");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_power_templates_powerType_key" ON "survivor_power_templates"("powerType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_power_templates_powerCategory_idx" ON "survivor_power_templates"("powerCategory");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_season_arc_templates_name_key" ON "survivor_season_arc_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_challenge_templates_challengeKey_key" ON "survivor_challenge_templates"("challengeKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_challenge_templates_category_phaseValidity_idx" ON "survivor_challenge_templates"("category", "phaseValidity");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_power_balances_leagueId_key" ON "survivor_power_balances"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_power_balances_leagueId_idx" ON "survivor_power_balances"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_twist_events_leagueId_week_idx" ON "survivor_twist_events"("leagueId", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_audit_entries_leagueId_category_idx" ON "survivor_audit_entries"("leagueId", "category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_audit_entries_leagueId_week_idx" ON "survivor_audit_entries"("leagueId", "week");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_game_states_leagueId_key" ON "survivor_game_states"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_game_states_phase_idx" ON "survivor_game_states"("phase");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_phase_transitions_leagueId_idx" ON "survivor_phase_transitions"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_notifications_leagueId_status_idx" ON "survivor_notifications"("leagueId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_notifications_recipientUserId_status_idx" ON "survivor_notifications"("recipientUserId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_chat_messages_channelId_createdAt_idx" ON "survivor_chat_messages"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_chat_messages_leagueId_channelType_idx" ON "survivor_chat_messages"("leagueId", "channelType");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_chat_reactions_messageId_userId_emoji_key" ON "survivor_chat_reactions"("messageId", "userId", "emoji");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_commissioner_actions_leagueId_idx" ON "survivor_commissioner_actions"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_commissioner_actions_commissionerId_idx" ON "survivor_commissioner_actions"("commissionerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_season_snapshots_leagueId_key" ON "survivor_season_snapshots"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_season_snapshots_leagueId_idx" ON "survivor_season_snapshots"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "survivor_weekly_scores_leagueId_week_idx" ON "survivor_weekly_scores"("leagueId", "week");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_weekly_scores_leagueId_userId_week_key" ON "survivor_weekly_scores"("leagueId", "userId", "week");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "big_brother_league_configs_leagueId_key" ON "big_brother_league_configs"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "big_brother_cycles_leagueId_week_idx" ON "big_brother_cycles"("leagueId", "week");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "big_brother_cycles_configId_week_key" ON "big_brother_cycles"("configId", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "big_brother_eviction_votes_cycleId_idx" ON "big_brother_eviction_votes"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "big_brother_eviction_votes_cycleId_voterRosterId_key" ON "big_brother_eviction_votes"("cycleId", "voterRosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "big_brother_jury_members_leagueId_idx" ON "big_brother_jury_members"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "big_brother_jury_members_leagueId_rosterId_key" ON "big_brother_jury_members"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "big_brother_finale_votes_leagueId_idx" ON "big_brother_finale_votes"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "big_brother_finale_votes_leagueId_juryRosterId_key" ON "big_brother_finale_votes"("leagueId", "juryRosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "big_brother_audit_logs_leagueId_eventType_idx" ON "big_brother_audit_logs"("leagueId", "eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "big_brother_audit_logs_createdAt_idx" ON "big_brother_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "big_brother_chat_command_logs_leagueId_createdAt_idx" ON "big_brother_chat_command_logs"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "big_brother_chat_command_logs_userId_idx" ON "big_brother_chat_command_logs"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_universes_status_idx" ON "zombie_universes"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_universes_commissionedByUserId_idx" ON "zombie_universes"("commissionedByUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_universe_levels_universeId_idx" ON "zombie_universe_levels"("universeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "zombie_universe_levels_universeId_rankOrder_key" ON "zombie_universe_levels"("universeId", "rankOrder");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "zombie_leagues_leagueId_key" ON "zombie_leagues"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_leagues_universeId_idx" ON "zombie_leagues"("universeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_leagues_levelId_idx" ON "zombie_leagues"("levelId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_leagues_status_idx" ON "zombie_leagues"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "zombie_whisperer_records_zombieLeagueId_key" ON "zombie_whisperer_records"("zombieLeagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_whisperer_records_zombieLeagueId_idx" ON "zombie_whisperer_records"("zombieLeagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_whisperer_records_userId_idx" ON "zombie_whisperer_records"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_infection_events_zombieLeagueId_week_idx" ON "zombie_infection_events"("zombieLeagueId", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_infection_events_victimUserId_idx" ON "zombie_infection_events"("victimUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_infection_events_infectorUserId_idx" ON "zombie_infection_events"("infectorUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_weekly_resolutions_zombieLeagueId_idx" ON "zombie_weekly_resolutions"("zombieLeagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "zombie_weekly_resolutions_zombieLeagueId_week_key" ON "zombie_weekly_resolutions"("zombieLeagueId", "week");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "zombie_item_templates_itemType_key" ON "zombie_item_templates"("itemType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_universe_stats_universeId_tierLabel_idx" ON "zombie_universe_stats"("universeId", "tierLabel");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_universe_stats_userId_idx" ON "zombie_universe_stats"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "zombie_universe_stats_universeId_userId_season_key" ON "zombie_universe_stats"("universeId", "userId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_movement_records_universeId_season_idx" ON "zombie_movement_records"("universeId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_movement_records_userId_idx" ON "zombie_movement_records"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_announcements_zombieLeagueId_type_idx" ON "zombie_announcements"("zombieLeagueId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_announcements_isPosted_scheduledFor_idx" ON "zombie_announcements"("isPosted", "scheduledFor");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_name_records_universeId_idx" ON "zombie_name_records"("universeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "zombie_paid_configs_zombieLeagueId_key" ON "zombie_paid_configs"("zombieLeagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "zombie_rules_templates_sport_key" ON "zombie_rules_templates"("sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_rules_documents_leagueId_idx" ON "zombie_rules_documents"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "zombie_rules_documents_leagueId_version_key" ON "zombie_rules_documents"("leagueId", "version");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_audit_entries_zombieLeagueId_category_idx" ON "zombie_audit_entries"("zombieLeagueId", "category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_audit_entries_zombieLeagueId_week_idx" ON "zombie_audit_entries"("zombieLeagueId", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_audit_entries_actorUserId_idx" ON "zombie_audit_entries"("actorUserId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "zombie_free_reward_configs_zombieLeagueId_key" ON "zombie_free_reward_configs"("zombieLeagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_ambush_actions_zombieLeagueId_week_idx" ON "zombie_ambush_actions"("zombieLeagueId", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_ambush_actions_whispererUserId_idx" ON "zombie_ambush_actions"("whispererUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_bashing_events_leagueId_week_idx" ON "zombie_bashing_events"("leagueId", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_mauling_events_leagueId_week_idx" ON "zombie_mauling_events"("leagueId", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_chimmy_actions_leagueId_userId_week_idx" ON "zombie_chimmy_actions"("leagueId", "userId", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_chimmy_actions_leagueId_actionType_idx" ON "zombie_chimmy_actions"("leagueId", "actionType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_commissioner_notifications_leagueId_commissionerId_i_idx" ON "zombie_commissioner_notifications"("leagueId", "commissionerId", "isRead");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_event_animations_leagueId_isDelivered_idx" ON "zombie_event_animations"("leagueId", "isDelivered");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "zombie_league_configs_leagueId_key" ON "zombie_league_configs"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "idp_league_configs_leagueId_key" ON "idp_league_configs"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "dynasty_league_configs_leagueId_key" ON "dynasty_league_configs"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dynasty_draft_order_audit_logs_leagueId_idx" ON "dynasty_draft_order_audit_logs"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dynasty_draft_order_audit_logs_configId_idx" ON "dynasty_draft_order_audit_logs"("configId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idp_player_eligibility_sportsPlayerId_idx" ON "idp_player_eligibility"("sportsPlayerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idp_player_eligibility_leagueId_idx" ON "idp_player_eligibility"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "idp_player_eligibility_sportsPlayerId_leagueId_key" ON "idp_player_eligibility"("sportsPlayerId", "leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idp_best_ball_lineup_snapshots_leagueId_idx" ON "idp_best_ball_lineup_snapshots"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idp_best_ball_lineup_snapshots_rosterId_idx" ON "idp_best_ball_lineup_snapshots"("rosterId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "idp_best_ball_lineup_snapshots_leagueId_rosterId_periodKey_key" ON "idp_best_ball_lineup_snapshots"("leagueId", "rosterId", "periodKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idp_settings_audit_logs_leagueId_idx" ON "idp_settings_audit_logs"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idp_settings_audit_logs_configId_idx" ON "idp_settings_audit_logs"("configId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idp_settings_audit_logs_createdAt_idx" ON "idp_settings_audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "idp_cap_configs_leagueId_key" ON "idp_cap_configs"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idp_cap_configs_leagueId_idx" ON "idp_cap_configs"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idp_salary_records_leagueId_rosterId_idx" ON "idp_salary_records"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idp_salary_records_leagueId_status_idx" ON "idp_salary_records"("leagueId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "idp_salary_records_leagueId_rosterId_playerId_key" ON "idp_salary_records"("leagueId", "rosterId", "playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idp_dead_money_leagueId_rosterId_idx" ON "idp_dead_money"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idp_cap_projections_leagueId_rosterId_idx" ON "idp_cap_projections"("leagueId", "rosterId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "idp_cap_projections_leagueId_rosterId_projectionYear_key" ON "idp_cap_projections"("leagueId", "rosterId", "projectionYear");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idp_cap_transactions_leagueId_rosterId_idx" ON "idp_cap_transactions"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idp_cap_transactions_leagueId_transactionType_idx" ON "idp_cap_transactions"("leagueId", "transactionType");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "devy_league_configs_leagueId_key" ON "devy_league_configs"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "devy_leagues_leagueId_key" ON "devy_leagues"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_leagues_leagueId_idx" ON "devy_leagues"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_player_states_leagueId_playerType_idx" ON "devy_player_states"("leagueId", "playerType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_player_states_leagueId_bucketState_idx" ON "devy_player_states"("leagueId", "bucketState");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "devy_player_states_leagueId_rosterId_playerId_key" ON "devy_player_states"("leagueId", "rosterId", "playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_taxi_slots_leagueId_rosterId_idx" ON "devy_taxi_slots"("leagueId", "rosterId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "devy_taxi_slots_leagueId_rosterId_playerId_key" ON "devy_taxi_slots"("leagueId", "rosterId", "playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_devy_slots_leagueId_rosterId_idx" ON "devy_devy_slots"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_devy_slots_leagueId_hasEnteredNFL_idx" ON "devy_devy_slots"("leagueId", "hasEnteredNFL");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "devy_devy_slots_leagueId_rosterId_playerId_key" ON "devy_devy_slots"("leagueId", "rosterId", "playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_rookie_transitions_leagueId_nflEntryYear_idx" ON "devy_rookie_transitions"("leagueId", "nflEntryYear");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_draft_picks_leagueId_currentOwnerId_idx" ON "devy_draft_picks"("leagueId", "currentOwnerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_draft_picks_leagueId_pickType_season_idx" ON "devy_draft_picks"("leagueId", "pickType", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "devy_draft_picks_leagueId_pickType_season_round_originalOwn_key" ON "devy_draft_picks"("leagueId", "pickType", "season", "round", "originalOwnerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_import_sessions_leagueId_idx" ON "devy_import_sessions"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_import_sessions_commissionerId_idx" ON "devy_import_sessions"("commissionerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_import_sources_sessionId_idx" ON "devy_import_sources"("sessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_player_mappings_sessionId_idx" ON "devy_player_mappings"("sessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_player_mappings_sessionId_externalId_externalPlatform_idx" ON "devy_player_mappings"("sessionId", "externalId", "externalPlatform");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_manager_mappings_sessionId_idx" ON "devy_manager_mappings"("sessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_merge_conflicts_sessionId_idx" ON "devy_merge_conflicts"("sessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_merge_conflicts_sessionId_resolution_idx" ON "devy_merge_conflicts"("sessionId", "resolution");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_imported_seasons_leagueId_season_idx" ON "devy_imported_seasons"("leagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_imported_seasons_sessionId_idx" ON "devy_imported_seasons"("sessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_rights_leagueId_idx" ON "devy_rights"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_rights_rosterId_idx" ON "devy_rights"("rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_rights_devyPlayerId_idx" ON "devy_rights"("devyPlayerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_rights_state_idx" ON "devy_rights"("state");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_rights_leagueId_state_idx" ON "devy_rights"("leagueId", "state");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_rights_leagueId_rosterId_slotCategory_idx" ON "devy_rights"("leagueId", "rosterId", "slotCategory");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "devy_rights_leagueId_rosterId_devyPlayerId_key" ON "devy_rights"("leagueId", "rosterId", "devyPlayerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_lifecycle_events_leagueId_idx" ON "devy_lifecycle_events"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_lifecycle_events_leagueId_eventType_idx" ON "devy_lifecycle_events"("leagueId", "eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_lifecycle_events_createdAt_idx" ON "devy_lifecycle_events"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_commissioner_overrides_leagueId_idx" ON "devy_commissioner_overrides"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_commissioner_overrides_status_idx" ON "devy_commissioner_overrides"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_draft_histories_leagueId_idx" ON "devy_draft_histories"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_draft_histories_leagueId_draftKind_idx" ON "devy_draft_histories"("leagueId", "draftKind");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_draft_histories_seasonYear_idx" ON "devy_draft_histories"("seasonYear");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_class_strength_snapshots_sport_idx" ON "devy_class_strength_snapshots"("sport");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "devy_class_strength_snapshots_sport_seasonYear_key" ON "devy_class_strength_snapshots"("sport", "seasonYear");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_best_ball_lineup_snapshots_leagueId_idx" ON "devy_best_ball_lineup_snapshots"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "devy_best_ball_lineup_snapshots_rosterId_idx" ON "devy_best_ball_lineup_snapshots"("rosterId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "devy_best_ball_lineup_snapshots_leagueId_rosterId_periodKey_key" ON "devy_best_ball_lineup_snapshots"("leagueId", "rosterId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "c2c_league_configs_leagueId_key" ON "c2c_league_configs"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "c2c_scoring_logs_leagueId_week_idx" ON "c2c_scoring_logs"("leagueId", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "c2c_scoring_logs_rosterId_season_week_idx" ON "c2c_scoring_logs"("rosterId", "season", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "c2c_scoring_logs_devyPlayerId_season_idx" ON "c2c_scoring_logs"("devyPlayerId", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "c2c_scoring_logs_leagueId_rosterId_devyPlayerId_season_week_key" ON "c2c_scoring_logs"("leagueId", "rosterId", "devyPlayerId", "season", "week", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "c2c_leagues_leagueId_key" ON "c2c_leagues"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "c2c_leagues_leagueId_idx" ON "c2c_leagues"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "c2c_leagues_sportPair_idx" ON "c2c_leagues"("sportPair");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "c2c_player_states_leagueId_playerSide_bucketState_idx" ON "c2c_player_states"("leagueId", "playerSide", "bucketState");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "c2c_player_states_leagueId_rosterId_playerId_key" ON "c2c_player_states"("leagueId", "rosterId", "playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "c2c_matchup_scores_leagueId_week_idx" ON "c2c_matchup_scores"("leagueId", "week");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "c2c_matchup_scores_leagueId_matchupId_rosterId_key" ON "c2c_matchup_scores"("leagueId", "matchupId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "c2c_draft_picks_leagueId_currentOwnerId_idx" ON "c2c_draft_picks"("leagueId", "currentOwnerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "c2c_draft_picks_leagueId_pickSide_season_idx" ON "c2c_draft_picks"("leagueId", "pickSide", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "c2c_draft_picks_leagueId_pickSide_season_round_originalOwne_key" ON "c2c_draft_picks"("leagueId", "pickSide", "season", "round", "originalOwnerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "c2c_transition_records_leagueId_proEntryYear_idx" ON "c2c_transition_records"("leagueId", "proEntryYear");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_league_teams_leagueId_idx" ON "zombie_league_teams"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_league_teams_zombieLeagueId_idx" ON "zombie_league_teams"("zombieLeagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_league_teams_rosterId_idx" ON "zombie_league_teams"("rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_league_teams_status_idx" ON "zombie_league_teams"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "zombie_league_teams_leagueId_rosterId_key" ON "zombie_league_teams"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_team_items_teamStatusId_idx" ON "zombie_team_items"("teamStatusId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_team_items_zombieLeagueId_userId_idx" ON "zombie_team_items"("zombieLeagueId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_infection_logs_leagueId_week_idx" ON "zombie_infection_logs"("leagueId", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_infection_logs_zombieLeagueId_idx" ON "zombie_infection_logs"("zombieLeagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_infection_logs_survivorRosterId_idx" ON "zombie_infection_logs"("survivorRosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_resource_ledgers_leagueId_rosterId_resourceType_idx" ON "zombie_resource_ledgers"("leagueId", "rosterId", "resourceType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_resource_ledgers_zombieLeagueId_idx" ON "zombie_resource_ledgers"("zombieLeagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_resource_ledger_entries_leagueId_rosterId_idx" ON "zombie_resource_ledger_entries"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_resource_ledger_entries_leagueId_week_idx" ON "zombie_resource_ledger_entries"("leagueId", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_weekly_winnings_zombieLeagueId_idx" ON "zombie_weekly_winnings"("zombieLeagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_weekly_winnings_leagueId_week_idx" ON "zombie_weekly_winnings"("leagueId", "week");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "zombie_weekly_winnings_leagueId_rosterId_week_key" ON "zombie_weekly_winnings"("leagueId", "rosterId", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_movement_projections_universeId_idx" ON "zombie_movement_projections"("universeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_movement_projections_leagueId_idx" ON "zombie_movement_projections"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "zombie_movement_projections_universeId_rosterId_season_key" ON "zombie_movement_projections"("universeId", "rosterId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_ambush_events_zombieLeagueId_week_idx" ON "zombie_ambush_events"("zombieLeagueId", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_audit_logs_leagueId_idx" ON "zombie_audit_logs"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_audit_logs_universeId_idx" ON "zombie_audit_logs"("universeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_audit_logs_zombieLeagueId_idx" ON "zombie_audit_logs"("zombieLeagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "zombie_audit_logs_eventType_idx" ON "zombie_audit_logs"("eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "roster_templates_sport_type_idx" ON "roster_templates"("sport_type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "roster_templates_sport_type_formatType_key" ON "roster_templates"("sport_type", "formatType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "roster_template_slots_templateId_idx" ON "roster_template_slots"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "league_roster_configs_leagueId_key" ON "league_roster_configs"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_roster_configs_leagueId_idx" ON "league_roster_configs"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "scoring_templates_sport_type_idx" ON "scoring_templates"("sport_type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "scoring_templates_sport_type_formatType_key" ON "scoring_templates"("sport_type", "formatType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "scoring_rules_templateId_idx" ON "scoring_rules"("templateId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "scoring_rules_templateId_statKey_idx" ON "scoring_rules"("templateId", "statKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_scoring_overrides_leagueId_idx" ON "league_scoring_overrides"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "league_scoring_overrides_leagueId_statKey_key" ON "league_scoring_overrides"("leagueId", "statKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sport_feature_flags_sport_type_key" ON "sport_feature_flags"("sport_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "schedule_templates_sport_type_idx" ON "schedule_templates"("sport_type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "schedule_templates_sport_type_formatType_key" ON "schedule_templates"("sport_type", "formatType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "season_calendars_sport_type_idx" ON "season_calendars"("sport_type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "season_calendars_sport_type_formatType_key" ON "season_calendars"("sport_type", "formatType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "game_schedules_sport_type_season_weekOrRound_idx" ON "game_schedules"("sport_type", "season", "weekOrRound");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "game_schedules_sport_type_season_idx" ON "game_schedules"("sport_type", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "game_schedules_startTime_idx" ON "game_schedules"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "game_schedules_sport_type_season_weekOrRound_externalId_key" ON "game_schedules"("sport_type", "season", "weekOrRound", "externalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_game_stats_sport_type_season_weekOrRound_idx" ON "player_game_stats"("sport_type", "season", "weekOrRound");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_game_stats_playerId_sport_type_season_idx" ON "player_game_stats"("playerId", "sport_type", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "player_game_stats_playerId_sport_type_gameId_key" ON "player_game_stats"("playerId", "sport_type", "gameId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_game_stats_sport_type_season_weekOrRound_idx" ON "team_game_stats"("sport_type", "season", "weekOrRound");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "team_game_stats_sport_type_gameId_teamId_key" ON "team_game_stats"("sport_type", "gameId", "teamId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stat_ingestion_jobs_sport_type_season_idx" ON "stat_ingestion_jobs"("sport_type", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stat_ingestion_jobs_status_startedAt_idx" ON "stat_ingestion_jobs"("status", "startedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_meta_trends_sport_idx" ON "player_meta_trends"("sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_meta_trends_trendScore_idx" ON "player_meta_trends"("trendScore");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_meta_trends_trendingDirection_idx" ON "player_meta_trends"("trendingDirection");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_meta_trends_updatedAt_idx" ON "player_meta_trends"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "player_meta_trends_playerId_sport_key" ON "player_meta_trends"("playerId", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trend_signal_events_playerId_sport_idx" ON "trend_signal_events"("playerId", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trend_signal_events_sport_signalType_timestamp_idx" ON "trend_signal_events"("sport", "signalType", "timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trend_signal_events_timestamp_idx" ON "trend_signal_events"("timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "strategy_meta_reports_sport_idx" ON "strategy_meta_reports"("sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "strategy_meta_reports_leagueFormat_idx" ON "strategy_meta_reports"("leagueFormat");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "strategy_meta_reports_updatedAt_idx" ON "strategy_meta_reports"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "strategy_meta_reports_strategyType_sport_leagueFormat_key" ON "strategy_meta_reports"("strategyType", "sport", "leagueFormat");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "strategy_meta_snapshots_sport_createdAt_idx" ON "strategy_meta_snapshots"("sport", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "strategy_meta_snapshots_strategyType_sport_idx" ON "strategy_meta_snapshots"("strategyType", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "global_meta_snapshots_sport_season_weekOrPeriod_idx" ON "global_meta_snapshots"("sport", "season", "weekOrPeriod");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "global_meta_snapshots_metaType_sport_idx" ON "global_meta_snapshots"("metaType", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "global_meta_snapshots_createdAt_idx" ON "global_meta_snapshots"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "global_meta_snapshots_sport_season_weekOrPeriod_metaType_key" ON "global_meta_snapshots"("sport", "season", "weekOrPeriod", "metaType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "position_meta_trends_sport_idx" ON "position_meta_trends"("sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "position_meta_trends_trendingDirection_idx" ON "position_meta_trends"("trendingDirection");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "position_meta_trends_position_sport_key" ON "position_meta_trends"("position", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "waiver_claims_leagueId_status_idx" ON "waiver_claims"("leagueId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "waiver_claims_rosterId_idx" ON "waiver_claims"("rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "waiver_claims_leagueId_priorityOrder_idx" ON "waiver_claims"("leagueId", "priorityOrder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "waiver_claims_leagueId_sport_type_idx" ON "waiver_claims"("leagueId", "sport_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "waiver_claims_sport_type_status_idx" ON "waiver_claims"("sport_type", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "waiver_transactions_leagueId_processedAt_idx" ON "waiver_transactions"("leagueId", "processedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "waiver_transactions_rosterId_idx" ON "waiver_transactions"("rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "waiver_transactions_leagueId_sport_type_idx" ON "waiver_transactions"("leagueId", "sport_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "waiver_transactions_sport_type_processedAt_idx" ON "waiver_transactions"("sport_type", "processedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "waiver_pickups_userId_idx" ON "waiver_pickups"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "waiver_pickups_leagueId_idx" ON "waiver_pickups"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sleeper_leagues_sleeperLeagueId_key" ON "sleeper_leagues"("sleeperLeagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sleeper_leagues_userId_sleeperLeagueId_idx" ON "sleeper_leagues"("userId", "sleeperLeagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sleeper_rosters_leagueId_idx" ON "sleeper_rosters"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sleeper_rosters_ownerId_idx" ON "sleeper_rosters"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sleeper_rosters_leagueId_rosterId_key" ON "sleeper_rosters"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RookieRanking_year_idx" ON "RookieRanking"("year");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RookieRanking_position_idx" ON "RookieRanking"("position");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RookieRanking_year_name_key" ON "RookieRanking"("year", "name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "mock_drafts_shareId_key" ON "mock_drafts"("shareId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "mock_drafts_inviteToken_key" ON "mock_drafts"("inviteToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mock_drafts_leagueId_idx" ON "mock_drafts"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mock_drafts_userId_idx" ON "mock_drafts"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mock_drafts_status_idx" ON "mock_drafts"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mock_drafts_inviteToken_idx" ON "mock_drafts"("inviteToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mock_draft_chats_mockDraftId_idx" ON "mock_draft_chats"("mockDraftId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "draft_sessions_sleeperDraftId_key" ON "draft_sessions"("sleeperDraftId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_sessions_leagueId_idx" ON "draft_sessions"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_sessions_status_idx" ON "draft_sessions"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_sessions_leagueId_sport_type_idx" ON "draft_sessions"("leagueId", "sport_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_sessions_sport_type_status_idx" ON "draft_sessions"("sport_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "draft_sessions_leagueId_key" ON "draft_sessions"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_picks_sessionId_idx" ON "draft_picks"("sessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_picks_sessionId_rosterId_idx" ON "draft_picks"("sessionId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_picks_sessionId_sport_type_idx" ON "draft_picks"("sessionId", "sport_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_picks_sport_type_idx" ON "draft_picks"("sport_type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "draft_picks_sessionId_overall_key" ON "draft_picks"("sessionId", "overall");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_pick_trade_proposals_sessionId_idx" ON "draft_pick_trade_proposals"("sessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_pick_trade_proposals_sessionId_receiverRosterId_idx" ON "draft_pick_trade_proposals"("sessionId", "receiverRosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_pick_trade_proposals_sessionId_status_idx" ON "draft_pick_trade_proposals"("sessionId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_manager_audit_log_leagueId_idx" ON "ai_manager_audit_log"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_manager_audit_log_leagueId_rosterId_idx" ON "ai_manager_audit_log"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_manager_audit_log_leagueId_action_idx" ON "ai_manager_audit_log"("leagueId", "action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_manager_audit_log_createdAt_idx" ON "ai_manager_audit_log"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_queues_sessionId_idx" ON "draft_queues"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "draft_queues_sessionId_userId_key" ON "draft_queues"("sessionId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_queue_entries_draftSessionId_userId_idx" ON "draft_queue_entries"("draftSessionId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_chat_messages_draftSessionId_idx" ON "draft_chat_messages"("draftSessionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "draft_import_backups_leagueId_key" ON "draft_import_backups"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_import_backups_leagueId_idx" ON "draft_import_backups"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rankings_backtest_results_leagueId_season_idx" ON "rankings_backtest_results"("leagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rankings_backtest_results_segmentKey_idx" ON "rankings_backtest_results"("segmentKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rankings_backtest_results_createdAt_idx" ON "rankings_backtest_results"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "rankings_backtest_results_leagueId_season_weekEvaluated_tar_key" ON "rankings_backtest_results"("leagueId", "season", "weekEvaluated", "targetType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_prediction_snapshots_leagueId_season_idx" ON "draft_prediction_snapshots"("leagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_prediction_snapshots_leagueId_sport_type_season_idx" ON "draft_prediction_snapshots"("leagueId", "sport_type", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_prediction_snapshots_sport_type_season_idx" ON "draft_prediction_snapshots"("sport_type", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_prediction_snapshots_userId_createdAt_idx" ON "draft_prediction_snapshots"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_retrospectives_leagueId_season_idx" ON "draft_retrospectives"("leagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_retrospectives_leagueId_sport_type_season_idx" ON "draft_retrospectives"("leagueId", "sport_type", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_retrospectives_sport_type_season_idx" ON "draft_retrospectives"("sport_type", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_retrospectives_snapshotId_idx" ON "draft_retrospectives"("snapshotId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_draft_calibrations_leagueId_sport_type_season_idx" ON "league_draft_calibrations"("leagueId", "sport_type", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_draft_calibrations_sport_type_season_idx" ON "league_draft_calibrations"("sport_type", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_draft_calibrations_leagueId_idx" ON "league_draft_calibrations"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "league_draft_calibrations_leagueId_season_key" ON "league_draft_calibrations"("leagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_adp_snapshots_sport_idx" ON "ai_adp_snapshots"("sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_adp_snapshots_computedAt_idx" ON "ai_adp_snapshots"("computedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ai_adp_snapshots_sport_leagueType_formatKey_key" ON "ai_adp_snapshots"("sport", "leagueType", "formatKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_adp_snapshot_history_sport_leagueType_formatKey_computed_idx" ON "ai_adp_snapshot_history"("sport", "leagueType", "formatKey", "computedAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_adp_snapshot_history_computedAt_idx" ON "ai_adp_snapshot_history"("computedAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "share_engagements_sleeperUsername_idx" ON "share_engagements"("sleeperUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "share_engagements_sleeperUsername_shareType_idx" ON "share_engagements"("sleeperUsername", "shareType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "share_engagements_createdAt_idx" ON "share_engagements"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_chat_threads_threadType_lastMessageAt_idx" ON "platform_chat_threads"("threadType", "lastMessageAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_chat_threads_createdByUserId_idx" ON "platform_chat_threads"("createdByUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_chat_thread_members_userId_joinedAt_idx" ON "platform_chat_thread_members"("userId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "platform_chat_thread_members_threadId_userId_key" ON "platform_chat_thread_members"("threadId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_chat_messages_threadId_createdAt_idx" ON "platform_chat_messages"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_chat_messages_senderUserId_createdAt_idx" ON "platform_chat_messages"("senderUserId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_chat_messages_globalBroadcastId_idx" ON "platform_chat_messages"("globalBroadcastId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "platform_notifications_sourceKey_key" ON "platform_notifications"("sourceKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_notifications_userId_createdAt_idx" ON "platform_notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_notifications_userId_readAt_idx" ON "platform_notifications"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "web_push_subscriptions_endpoint_key" ON "web_push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "web_push_subscriptions_userId_idx" ON "web_push_subscriptions"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "engagement_events_userId_createdAt_idx" ON "engagement_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "engagement_events_userId_eventType_idx" ON "engagement_events"("userId", "eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "engagement_events_eventType_idx" ON "engagement_events"("eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "podcast_episodes_userId_idx" ON "podcast_episodes"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "podcast_episodes_userId_createdAt_idx" ON "podcast_episodes"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "fantasy_media_episodes_userId_idx" ON "fantasy_media_episodes"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "fantasy_media_episodes_userId_mediaType_idx" ON "fantasy_media_episodes"("userId", "mediaType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "fantasy_media_episodes_userId_createdAt_idx" ON "fantasy_media_episodes"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "fantasy_media_episodes_status_idx" ON "fantasy_media_episodes"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "fantasy_media_publish_logs_episodeId_idx" ON "fantasy_media_publish_logs"("episodeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "social_clips_userId_idx" ON "social_clips"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "social_clips_userId_createdAt_idx" ON "social_clips"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "social_content_assets_userId_idx" ON "social_content_assets"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "social_content_assets_userId_assetType_idx" ON "social_content_assets"("userId", "assetType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "social_content_assets_userId_createdAt_idx" ON "social_content_assets"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "social_publish_targets_userId_idx" ON "social_publish_targets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "social_publish_targets_userId_platform_key" ON "social_publish_targets"("userId", "platform");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "social_publish_logs_assetId_idx" ON "social_publish_logs"("assetId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "social_publish_logs_assetId_platform_idx" ON "social_publish_logs"("assetId", "platform");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shareable_moments_userId_idx" ON "shareable_moments"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shareable_moments_userId_shareType_idx" ON "shareable_moments"("userId", "shareType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shareable_moments_userId_createdAt_idx" ON "shareable_moments"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "share_publish_logs_shareId_idx" ON "share_publish_logs"("shareId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "share_publish_logs_shareId_platform_idx" ON "share_publish_logs"("shareId", "platform");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_blocked_users_blockerUserId_idx" ON "platform_blocked_users"("blockerUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_blocked_users_blockedUserId_idx" ON "platform_blocked_users"("blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "platform_blocked_users_blockerUserId_blockedUserId_key" ON "platform_blocked_users"("blockerUserId", "blockedUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_message_reports_reporterUserId_idx" ON "platform_message_reports"("reporterUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_message_reports_messageId_threadId_idx" ON "platform_message_reports"("messageId", "threadId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_user_reports_reporterUserId_idx" ON "platform_user_reports"("reporterUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_user_reports_reportedUserId_idx" ON "platform_user_reports"("reportedUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_moderation_actions_userId_idx" ON "platform_moderation_actions"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_moderation_actions_userId_actionType_idx" ON "platform_moderation_actions"("userId", "actionType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_moderation_actions_expiresAt_idx" ON "platform_moderation_actions"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "admin_audit_log_adminUserId_idx" ON "admin_audit_log"("adminUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "admin_audit_log_action_idx" ON "admin_audit_log"("action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "admin_audit_log_createdAt_idx" ON "admin_audit_log"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "stripe_webhook_events_eventId_key" ON "stripe_webhook_events"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stripe_webhook_events_type_idx" ON "stripe_webhook_events"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stripe_webhook_events_status_idx" ON "stripe_webhook_events"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stripe_webhook_events_processedAt_idx" ON "stripe_webhook_events"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscription_plans_isActive_idx" ON "subscription_plans"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_subscriptions_stripeSubscriptionId_key" ON "user_subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_subscriptions_userId_idx" ON "user_subscriptions"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_subscriptions_userId_status_idx" ON "user_subscriptions"("userId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_subscriptions_subscriptionPlanId_status_idx" ON "user_subscriptions"("subscriptionPlanId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_subscriptions_stripeCustomerId_idx" ON "user_subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_subscriptions_currentPeriodEnd_idx" ON "user_subscriptions"("currentPeriodEnd");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_subscriptions_gracePeriodEnd_idx" ON "user_subscriptions"("gracePeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "token_packages_sku_key" ON "token_packages"("sku");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "token_packages_isActive_idx" ON "token_packages"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_token_balances_userId_key" ON "user_token_balances"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_token_balances_balance_idx" ON "user_token_balances"("balance");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "token_spend_rules_code_key" ON "token_spend_rules"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "token_spend_rules_isActive_idx" ON "token_spend_rules"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "token_spend_rules_category_isActive_idx" ON "token_spend_rules"("category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "token_refund_rules_code_key" ON "token_refund_rules"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "token_refund_rules_isActive_idx" ON "token_refund_rules"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "token_ledger_idempotencyKey_key" ON "token_ledger"("idempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "token_ledger_userId_createdAt_idx" ON "token_ledger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "token_ledger_entryType_createdAt_idx" ON "token_ledger"("entryType", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "token_ledger_tokenPackageSku_idx" ON "token_ledger"("tokenPackageSku");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "token_ledger_spendRuleCode_idx" ON "token_ledger"("spendRuleCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "token_ledger_refundRuleCode_idx" ON "token_ledger"("refundRuleCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "token_ledger_sourceType_sourceId_idx" ON "token_ledger"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "platform_wallet_accounts_userId_key" ON "platform_wallet_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "wallet_ledger_entries_sourceKey_key" ON "wallet_ledger_entries"("sourceKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wallet_ledger_entries_walletAccountId_createdAt_idx" ON "wallet_ledger_entries"("walletAccountId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wallet_ledger_entries_userId_createdAt_idx" ON "wallet_ledger_entries"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wallet_ledger_entries_entryType_status_idx" ON "wallet_ledger_entries"("entryType", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "season_forecast_snapshots_leagueId_season_week_idx" ON "season_forecast_snapshots"("leagueId", "season", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "season_forecast_snapshots_leagueId_sport_type_season_week_idx" ON "season_forecast_snapshots"("leagueId", "sport_type", "season", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "season_forecast_snapshots_sport_type_season_week_idx" ON "season_forecast_snapshots"("sport_type", "season", "week");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "season_forecast_snapshots_leagueId_season_week_key" ON "season_forecast_snapshots"("leagueId", "season", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dynasty_projection_snapshots_leagueId_season_idx" ON "dynasty_projection_snapshots"("leagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dynasty_projection_snapshots_leagueId_sport_type_season_idx" ON "dynasty_projection_snapshots"("leagueId", "sport_type", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dynasty_projection_snapshots_sport_type_season_idx" ON "dynasty_projection_snapshots"("sport_type", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dynasty_projection_snapshots_leagueId_teamId_season_idx" ON "dynasty_projection_snapshots"("leagueId", "teamId", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "dynasty_projection_snapshots_leagueId_teamId_season_key" ON "dynasty_projection_snapshots"("leagueId", "teamId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_career_projections_sport_season_idx" ON "player_career_projections"("sport", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_career_projections_sport_playerId_season_idx" ON "player_career_projections"("sport", "playerId", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "player_career_projections_sport_playerId_season_key" ON "player_career_projections"("sport", "playerId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_window_profiles_leagueId_season_idx" ON "team_window_profiles"("leagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_window_profiles_leagueId_sport_type_season_idx" ON "team_window_profiles"("leagueId", "sport_type", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_window_profiles_sport_type_season_idx" ON "team_window_profiles"("sport_type", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_window_profiles_leagueId_teamId_season_idx" ON "team_window_profiles"("leagueId", "teamId", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "team_window_profiles_leagueId_teamId_season_key" ON "team_window_profiles"("leagueId", "teamId", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "graph_nodes_nodeId_key" ON "graph_nodes"("nodeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "graph_nodes_leagueId_season_idx" ON "graph_nodes"("leagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "graph_nodes_nodeType_leagueId_idx" ON "graph_nodes"("nodeType", "leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "graph_nodes_entityId_leagueId_idx" ON "graph_nodes"("entityId", "leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "graph_nodes_leagueId_sport_idx" ON "graph_nodes"("leagueId", "sport");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "graph_edges_edgeId_key" ON "graph_edges"("edgeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "graph_edges_fromNodeId_idx" ON "graph_edges"("fromNodeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "graph_edges_toNodeId_idx" ON "graph_edges"("toNodeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "graph_edges_edgeType_season_idx" ON "graph_edges"("edgeType", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "graph_edges_fromNodeId_toNodeId_edgeType_idx" ON "graph_edges"("fromNodeId", "toNodeId", "edgeType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "graph_edges_edgeType_sport_idx" ON "graph_edges"("edgeType", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_graph_snapshots_leagueId_season_idx" ON "league_graph_snapshots"("leagueId", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "league_graph_snapshots_leagueId_season_key" ON "league_graph_snapshots"("leagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_dynasty_seasons_leagueId_idx" ON "league_dynasty_seasons"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "league_dynasty_seasons_platformLeagueId_idx" ON "league_dynasty_seasons"("platformLeagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "league_dynasty_seasons_leagueId_season_key" ON "league_dynasty_seasons"("leagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dynasty_backfill_status_leagueId_idx" ON "dynasty_backfill_status"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dynasty_backfill_status_status_idx" ON "dynasty_backfill_status"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "dynasty_backfill_status_leagueId_provider_key" ON "dynasty_backfill_status"("leagueId", "provider");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_player_game_facts_playerId_sport_idx" ON "dw_player_game_facts"("playerId", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_player_game_facts_sport_scoringPeriod_idx" ON "dw_player_game_facts"("sport", "scoringPeriod");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_player_game_facts_sport_season_weekOrRound_idx" ON "dw_player_game_facts"("sport", "season", "weekOrRound");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_player_game_facts_gameId_idx" ON "dw_player_game_facts"("gameId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_team_game_facts_teamId_sport_idx" ON "dw_team_game_facts"("teamId", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_team_game_facts_sport_season_weekOrRound_idx" ON "dw_team_game_facts"("sport", "season", "weekOrRound");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_team_game_facts_gameId_idx" ON "dw_team_game_facts"("gameId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_roster_snapshots_leagueId_weekOrPeriod_idx" ON "dw_roster_snapshots"("leagueId", "weekOrPeriod");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_roster_snapshots_teamId_sport_idx" ON "dw_roster_snapshots"("teamId", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_roster_snapshots_sport_season_idx" ON "dw_roster_snapshots"("sport", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_matchup_facts_leagueId_weekOrPeriod_idx" ON "dw_matchup_facts"("leagueId", "weekOrPeriod");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_matchup_facts_leagueId_season_idx" ON "dw_matchup_facts"("leagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_draft_facts_leagueId_idx" ON "dw_draft_facts"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_draft_facts_leagueId_round_idx" ON "dw_draft_facts"("leagueId", "round");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_draft_facts_playerId_sport_idx" ON "dw_draft_facts"("playerId", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_transaction_facts_leagueId_createdAt_idx" ON "dw_transaction_facts"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_transaction_facts_playerId_sport_idx" ON "dw_transaction_facts"("playerId", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_transaction_facts_type_idx" ON "dw_transaction_facts"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_season_standing_facts_leagueId_season_idx" ON "dw_season_standing_facts"("leagueId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dw_season_standing_facts_teamId_sport_idx" ON "dw_season_standing_facts"("teamId", "sport");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "dw_season_standing_facts_leagueId_season_teamId_key" ON "dw_season_standing_facts"("leagueId", "season", "teamId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sim_matchup_results_leagueId_weekOrPeriod_idx" ON "sim_matchup_results"("leagueId", "weekOrPeriod");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sim_matchup_results_sport_idx" ON "sim_matchup_results"("sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sim_season_results_leagueId_season_weekOrPeriod_idx" ON "sim_season_results"("leagueId", "season", "weekOrPeriod");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sim_season_results_teamId_idx" ON "sim_season_results"("teamId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sim_season_results_sport_idx" ON "sim_season_results"("sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dynasty_projections_leagueId_idx" ON "dynasty_projections"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dynasty_projections_teamId_idx" ON "dynasty_projections"("teamId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dynasty_projections_sport_idx" ON "dynasty_projections"("sport");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "dynasty_projections_leagueId_teamId_key" ON "dynasty_projections"("leagueId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "platform_config_key_key" ON "platform_config"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_rule_violation_logs_userId_idx" ON "ai_rule_violation_logs"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_rule_violation_logs_feature_idx" ON "ai_rule_violation_logs"("feature");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_rule_violation_logs_ruleId_idx" ON "ai_rule_violation_logs"("ruleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_rule_violation_logs_severity_idx" ON "ai_rule_violation_logs"("severity");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_rule_violation_logs_createdAt_idx" ON "ai_rule_violation_logs"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_custom_rules_enabled_idx" ON "ai_custom_rules"("enabled");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_custom_rules_category_idx" ON "ai_custom_rules"("category");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "mock_draft_rooms_inviteCode_key" ON "mock_draft_rooms"("inviteCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mock_draft_rooms_createdById_idx" ON "mock_draft_rooms"("createdById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_room_pick_records_leagueId_idx" ON "draft_room_pick_records"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_room_pick_records_roomId_idx" ON "draft_room_pick_records"("roomId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_room_pick_records_roomId_overallPick_idx" ON "draft_room_pick_records"("roomId", "overallPick");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_room_pick_records_leagueId_overallPick_idx" ON "draft_room_pick_records"("leagueId", "overallPick");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_room_user_queues_sessionKey_idx" ON "draft_room_user_queues"("sessionKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "draft_room_user_queues_userId_sessionKey_key" ON "draft_room_user_queues"("userId", "sessionKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_room_chat_messages_sessionKey_createdAt_idx" ON "draft_room_chat_messages"("sessionKey", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_room_state_leagueId_idx" ON "draft_room_state"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "draft_room_state_roomId_idx" ON "draft_room_state"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sport_configs_sport_key" ON "sport_configs"("sport");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sport_configs_slug_key" ON "sport_configs"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "redraft_seasons_leagueId_idx" ON "redraft_seasons"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "redraft_rosters_seasonId_idx" ON "redraft_rosters"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "redraft_rosters_seasonId_ownerId_key" ON "redraft_rosters"("seasonId", "ownerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "redraft_roster_players_rosterId_idx" ON "redraft_roster_players"("rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "redraft_roster_players_playerId_idx" ON "redraft_roster_players"("playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "redraft_matchups_seasonId_week_idx" ON "redraft_matchups"("seasonId", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "redraft_matchups_homeRosterId_idx" ON "redraft_matchups"("homeRosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "redraft_matchups_awayRosterId_idx" ON "redraft_matchups"("awayRosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "redraft_waiver_claims_seasonId_status_idx" ON "redraft_waiver_claims"("seasonId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "redraft_waiver_claims_rosterId_idx" ON "redraft_waiver_claims"("rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "redraft_league_trades_leagueId_status_idx" ON "redraft_league_trades"("leagueId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "redraft_league_trades_proposerRosterId_idx" ON "redraft_league_trades"("proposerRosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "redraft_league_trades_receiverRosterId_idx" ON "redraft_league_trades"("receiverRosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "redraft_league_transactions_leagueId_type_idx" ON "redraft_league_transactions"("leagueId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_weekly_scores_sport_week_season_idx" ON "player_weekly_scores"("sport", "week", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "player_weekly_scores_playerId_week_season_sport_key" ON "player_weekly_scores"("playerId", "week", "season", "sport");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "redraft_playoff_brackets_seasonId_key" ON "redraft_playoff_brackets"("seasonId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "redraft_ai_league_insights_leagueId_week_type_idx" ON "redraft_ai_league_insights"("leagueId", "week", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "redraft_ai_roster_insights_leagueId_week_idx" ON "redraft_ai_roster_insights"("leagueId", "week");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "redraft_ai_roster_insights_rosterId_week_key" ON "redraft_ai_roster_insights"("rosterId", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "keeper_records_leagueId_seasonId_idx" ON "keeper_records"("leagueId", "seasonId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "keeper_records_rosterId_seasonId_idx" ON "keeper_records"("rosterId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "keeper_records_seasonId_rosterId_playerId_key" ON "keeper_records"("seasonId", "rosterId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "keeper_selection_sessions_seasonId_key" ON "keeper_selection_sessions"("seasonId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "keeper_selection_sessions_leagueId_idx" ON "keeper_selection_sessions"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "keeper_eligibilities_leagueId_seasonId_idx" ON "keeper_eligibilities"("leagueId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "keeper_eligibilities_seasonId_rosterId_playerId_key" ON "keeper_eligibilities"("seasonId", "rosterId", "playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "keeper_pick_adjustments_seasonId_rosterId_idx" ON "keeper_pick_adjustments"("seasonId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "keeper_audit_logs_leagueId_seasonId_idx" ON "keeper_audit_logs"("leagueId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "best_ball_sport_templates_sport_variant_key" ON "best_ball_sport_templates"("sport", "variant");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "best_ball_optimized_lineups_seasonId_week_idx" ON "best_ball_optimized_lineups"("seasonId", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "best_ball_optimized_lineups_rosterId_idx" ON "best_ball_optimized_lineups"("rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "best_ball_optimized_lineups_contestId_entryId_idx" ON "best_ball_optimized_lineups"("contestId", "entryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "best_ball_contests_sport_status_idx" ON "best_ball_contests"("sport", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "best_ball_pods_contestId_idx" ON "best_ball_pods"("contestId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "best_ball_pods_contestId_roundNumber_podNumber_key" ON "best_ball_pods"("contestId", "roundNumber", "podNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "best_ball_entries_contestId_podId_idx" ON "best_ball_entries"("contestId", "podId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "best_ball_entries_userId_idx" ON "best_ball_entries"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "best_ball_roster_validations_seasonId_rosterId_idx" ON "best_ball_roster_validations"("seasonId", "rosterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "best_ball_roster_validations_contestId_entryId_idx" ON "best_ball_roster_validations"("contestId", "entryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "best_ball_ai_insights_leagueId_type_idx" ON "best_ball_ai_insights"("leagueId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "best_ball_ai_insights_contestId_type_idx" ON "best_ball_ai_insights"("contestId", "type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "guillotine_seasons_redraftSeasonId_key" ON "guillotine_seasons"("redraftSeasonId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guillotine_seasons_leagueId_idx" ON "guillotine_seasons"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guillotine_eliminations_seasonId_scoringPeriod_idx" ON "guillotine_eliminations"("seasonId", "scoringPeriod");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guillotine_eliminations_leagueId_idx" ON "guillotine_eliminations"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guillotine_survival_logs_seasonId_scoringPeriod_idx" ON "guillotine_survival_logs"("seasonId", "scoringPeriod");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guillotine_survival_logs_rosterId_idx" ON "guillotine_survival_logs"("rosterId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "guillotine_survival_logs_seasonId_rosterId_scoringPeriod_key" ON "guillotine_survival_logs"("seasonId", "rosterId", "scoringPeriod");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guillotine_waiver_releases_seasonId_releaseStatus_idx" ON "guillotine_waiver_releases"("seasonId", "releaseStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guillotine_waiver_releases_leagueId_scoringPeriod_idx" ON "guillotine_waiver_releases"("leagueId", "scoringPeriod");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guillotine_ai_insights_seasonId_type_idx" ON "guillotine_ai_insights"("seasonId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guillotine_ai_insights_rosterId_type_idx" ON "guillotine_ai_insights"("rosterId", "type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WeatherCache_cacheKey_key" ON "WeatherCache"("cacheKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WeatherCache_cacheKey_idx" ON "WeatherCache"("cacheKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WeatherCache_fetchedAt_idx" ON "WeatherCache"("fetchedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WeatherCache_forecastForTime_idx" ON "WeatherCache"("forecastForTime");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AFProjectionSnapshot_snapshotLookupKey_key" ON "AFProjectionSnapshot"("snapshotLookupKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AFProjectionSnapshot_playerId_week_season_idx" ON "AFProjectionSnapshot"("playerId", "week", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AFProjectionSnapshot_sport_week_season_idx" ON "AFProjectionSnapshot"("sport", "week", "season");

-- AddForeignKey
ALTER TABLE "UserEvent" ADD CONSTRAINT "UserEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LegacyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legacy_user_rank_cache" ADD CONSTRAINT "legacy_user_rank_cache_legacy_user_id_fkey" FOREIGN KEY ("legacy_user_id") REFERENCES "LegacyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacyImportJob" ADD CONSTRAINT "LegacyImportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LegacyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacyLeague" ADD CONSTRAINT "LegacyLeague_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LegacyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacyRoster" ADD CONSTRAINT "LegacyRoster_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "LegacyLeague"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacySeasonSummary" ADD CONSTRAINT "LegacySeasonSummary_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "LegacyLeague"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacyAIReport" ADD CONSTRAINT "LegacyAIReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LegacyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_feedback" ADD CONSTRAINT "trade_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_profiles" ADD CONSTRAINT "trade_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueTrade" ADD CONSTRAINT "LeagueTrade_historyId_fkey" FOREIGN KEY ("historyId") REFERENCES "LeagueTradeHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YahooLeague" ADD CONSTRAINT "YahooLeague_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "YahooConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YahooTeam" ADD CONSTRAINT "YahooTeam_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "YahooLeague"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIIssueFeedback" ADD CONSTRAINT "AIIssueFeedback_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "AIIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FantraxLeague" ADD CONSTRAINT "FantraxLeague_userId_fkey" FOREIGN KEY ("userId") REFERENCES "FantraxUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_outcomes" ADD CONSTRAINT "decision_outcomes_decisionLogId_fkey" FOREIGN KEY ("decisionLogId") REFERENCES "decision_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevyAdp" ADD CONSTRAINT "DevyAdp_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "DevyPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_legacyUserId_fkey" FOREIGN KEY ("legacyUserId") REFERENCES "LegacyUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_attributions" ADD CONSTRAINT "growth_attributions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_link_events" ADD CONSTRAINT "invite_link_events_inviteLinkId_fkey" FOREIGN KEY ("inviteLinkId") REFERENCES "invite_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_leagues" ADD CONSTRAINT "creator_leagues_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_invites" ADD CONSTRAINT "creator_invites_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_invites" ADD CONSTRAINT "creator_invites_creatorLeagueId_fkey" FOREIGN KEY ("creatorLeagueId") REFERENCES "creator_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_league_members" ADD CONSTRAINT "creator_league_members_creatorLeagueId_fkey" FOREIGN KEY ("creatorLeagueId") REFERENCES "creator_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "referral_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "referral_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_rewardRuleId_fkey" FOREIGN KEY ("rewardRuleId") REFERENCES "referral_reward_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketNode" ADD CONSTRAINT "BracketNode_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "BracketTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketLeague" ADD CONSTRAINT "BracketLeague_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "BracketTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketLeague" ADD CONSTRAINT "BracketLeague_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketLeagueMember" ADD CONSTRAINT "BracketLeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "BracketLeague"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketLeagueMember" ADD CONSTRAINT "BracketLeagueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketEntry" ADD CONSTRAINT "BracketEntry_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "BracketLeague"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketEntry" ADD CONSTRAINT "BracketEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketEntrySnapshot" ADD CONSTRAINT "BracketEntrySnapshot_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "BracketEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketPick" ADD CONSTRAINT "BracketPick_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "BracketEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketPick" ADD CONSTRAINT "BracketPick_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "BracketNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_league_messages" ADD CONSTRAINT "bracket_league_messages_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "BracketLeague"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_league_messages" ADD CONSTRAINT "bracket_league_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_league_messages" ADD CONSTRAINT "bracket_league_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "bracket_league_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_message_reactions" ADD CONSTRAINT "bracket_message_reactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "bracket_league_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_message_reactions" ADD CONSTRAINT "bracket_message_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketPayment" ADD CONSTRAINT "BracketPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketPayment" ADD CONSTRAINT "BracketPayment_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "BracketLeague"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketPayment" ADD CONSTRAINT "BracketPayment_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "BracketTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_risk_profiles" ADD CONSTRAINT "bracket_risk_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rivalry_events" ADD CONSTRAINT "rivalry_events_rivalryId_fkey" FOREIGN KEY ("rivalryId") REFERENCES "rivalry_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_evidence_records" ADD CONSTRAINT "profile_evidence_records_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "manager_psych_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_drafts" ADD CONSTRAINT "blog_drafts_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "blog_articles"("articleId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_publish_logs" ADD CONSTRAINT "blog_publish_logs_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "blog_articles"("articleId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discord_guild_links" ADD CONSTRAINT "discord_guild_links_linkedByUserId_fkey" FOREIGN KEY ("linkedByUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discord_league_channels" ADD CONSTRAINT "discord_league_channels_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discord_league_channels" ADD CONSTRAINT "discord_league_channels_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "discord_guild_links"("guildId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verify_tokens" ADD CONSTRAINT "email_verify_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_bbContestId_fkey" FOREIGN KEY ("bbContestId") REFERENCES "best_ball_contests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_legacyLeagueId_fkey" FOREIGN KEY ("legacyLeagueId") REFERENCES "LegacyLeague"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrity_flags" ADD CONSTRAINT "integrity_flags_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_integrity_settings" ADD CONSTRAINT "league_integrity_settings_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_coach_settings" ADD CONSTRAINT "auto_coach_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_coach_settings" ADD CONSTRAINT "auto_coach_settings_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_settings" ADD CONSTRAINT "league_settings_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_seasons" ADD CONSTRAINT "league_seasons_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_seasons" ADD CONSTRAINT "league_seasons_championTeamId_fkey" FOREIGN KEY ("championTeamId") REFERENCES "league_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_storylines" ADD CONSTRAINT "league_storylines_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_matchup_previews" ADD CONSTRAINT "league_matchup_previews_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_recaps" ADD CONSTRAINT "draft_recaps_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_recaps" ADD CONSTRAINT "draft_recaps_draftSessionId_fkey" FOREIGN KEY ("draftSessionId") REFERENCES "draft_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keeper_declarations" ADD CONSTRAINT "keeper_declarations_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keeper_declarations" ADD CONSTRAINT "keeper_declarations_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_settings_snapshots" ADD CONSTRAINT "scoring_settings_snapshots_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_intro_views" ADD CONSTRAINT "league_intro_views_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_intro_views" ADD CONSTRAINT "league_intro_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_templates" ADD CONSTRAINT "league_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_conferences" ADD CONSTRAINT "tournament_conferences_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_leagues" ADD CONSTRAINT "tournament_leagues_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_leagues" ADD CONSTRAINT "tournament_leagues_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "tournament_conferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_leagues" ADD CONSTRAINT "tournament_leagues_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_rounds" ADD CONSTRAINT "tournament_rounds_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_announcements" ADD CONSTRAINT "tournament_announcements_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_audit_logs" ADD CONSTRAINT "tournament_audit_logs_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "tournament_conferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_shells" ADD CONSTRAINT "tournament_shells_commissionerId_fkey" FOREIGN KEY ("commissionerId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_shells" ADD CONSTRAINT "tournament_shells_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_shell_conferences" ADD CONSTRAINT "tournament_shell_conferences_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournament_shells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_shell_rounds" ADD CONSTRAINT "tournament_shell_rounds_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournament_shells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_shell_leagues" ADD CONSTRAINT "tournament_shell_leagues_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournament_shells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_shell_leagues" ADD CONSTRAINT "tournament_shell_leagues_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "tournament_shell_conferences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_shell_leagues" ADD CONSTRAINT "tournament_shell_leagues_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "tournament_shell_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_shell_leagues" ADD CONSTRAINT "tournament_shell_leagues_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_shell_leagues" ADD CONSTRAINT "tournament_shell_leagues_advancementGroupId_fkey" FOREIGN KEY ("advancementGroupId") REFERENCES "tournament_shell_advancement_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_shell_participants" ADD CONSTRAINT "tournament_shell_participants_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournament_shells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_shell_league_participants" ADD CONSTRAINT "tournament_shell_league_participants_tournamentLeagueId_fkey" FOREIGN KEY ("tournamentLeagueId") REFERENCES "tournament_shell_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_shell_league_participants" ADD CONSTRAINT "tournament_shell_league_participants_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "tournament_shell_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_shell_advancement_groups" ADD CONSTRAINT "tournament_shell_advancement_groups_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournament_shells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_shell_advancement_groups" ADD CONSTRAINT "tournament_shell_advancement_groups_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "tournament_shell_conferences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_shell_name_records" ADD CONSTRAINT "tournament_shell_name_records_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournament_shells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_shell_announcements" ADD CONSTRAINT "tournament_shell_announcements_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournament_shells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_shell_audit_logs" ADD CONSTRAINT "tournament_shell_audit_logs_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournament_shells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_chat_messages" ADD CONSTRAINT "league_chat_messages_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_chat_messages" ADD CONSTRAINT "league_chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplemental_drafts" ADD CONSTRAINT "supplemental_drafts_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplemental_drafts" ADD CONSTRAINT "supplemental_drafts_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplemental_draft_picks" ADD CONSTRAINT "supplemental_draft_picks_supplementalDraftId_fkey" FOREIGN KEY ("supplementalDraftId") REFERENCES "supplemental_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_commissioner_configs" ADD CONSTRAINT "ai_commissioner_configs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_commissioner_alerts" ADD CONSTRAINT "ai_commissioner_alerts_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_commissioner_action_logs" ADD CONSTRAINT "ai_commissioner_action_logs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueInvite" ADD CONSTRAINT "LeagueInvite_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueManagerClaim" ADD CONSTRAINT "LeagueManagerClaim_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "find_league_listings" ADD CONSTRAINT "find_league_listings_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_teams" ADD CONSTRAINT "league_teams_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_teams" ADD CONSTRAINT "league_teams_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "league_divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_teams" ADD CONSTRAINT "league_teams_legacyRosterId_fkey" FOREIGN KEY ("legacyRosterId") REFERENCES "LegacyRoster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_divisions" ADD CONSTRAINT "league_divisions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_rules" ADD CONSTRAINT "promotion_rules_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_performances" ADD CONSTRAINT "team_performances_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "league_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_auths" ADD CONSTRAINT "league_auths_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_waiver_settings" ADD CONSTRAINT "league_waiver_settings_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guillotine_league_configs" ADD CONSTRAINT "guillotine_league_configs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_cap_league_configs" ADD CONSTRAINT "salary_cap_league_configs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_cap_team_ledgers" ADD CONSTRAINT "salary_cap_team_ledgers_configId_fkey" FOREIGN KEY ("configId") REFERENCES "salary_cap_league_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_contracts" ADD CONSTRAINT "player_contracts_configId_fkey" FOREIGN KEY ("configId") REFERENCES "salary_cap_league_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_cap_event_logs" ADD CONSTRAINT "salary_cap_event_logs_configId_fkey" FOREIGN KEY ("configId") REFERENCES "salary_cap_league_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_league_configs" ADD CONSTRAINT "survivor_league_configs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_tribes" ADD CONSTRAINT "survivor_tribes_configId_fkey" FOREIGN KEY ("configId") REFERENCES "survivor_league_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_tribe_members" ADD CONSTRAINT "survivor_tribe_members_tribeId_fkey" FOREIGN KEY ("tribeId") REFERENCES "survivor_tribes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_idols" ADD CONSTRAINT "survivor_idols_configId_fkey" FOREIGN KEY ("configId") REFERENCES "survivor_league_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_idol_ledger_entries" ADD CONSTRAINT "survivor_idol_ledger_entries_idolId_fkey" FOREIGN KEY ("idolId") REFERENCES "survivor_idols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_tribal_councils" ADD CONSTRAINT "survivor_tribal_councils_configId_fkey" FOREIGN KEY ("configId") REFERENCES "survivor_league_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_tribal_councils" ADD CONSTRAINT "survivor_tribal_councils_attendingTribeId_fkey" FOREIGN KEY ("attendingTribeId") REFERENCES "survivor_tribes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_votes" ADD CONSTRAINT "survivor_votes_councilId_fkey" FOREIGN KEY ("councilId") REFERENCES "survivor_tribal_councils"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_exile_leagues" ADD CONSTRAINT "survivor_exile_leagues_configId_fkey" FOREIGN KEY ("configId") REFERENCES "survivor_league_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_audit_logs" ADD CONSTRAINT "survivor_audit_logs_configId_fkey" FOREIGN KEY ("configId") REFERENCES "survivor_league_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_challenges" ADD CONSTRAINT "survivor_challenges_configId_fkey" FOREIGN KEY ("configId") REFERENCES "survivor_league_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_challenge_submissions" ADD CONSTRAINT "survivor_challenge_submissions_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "survivor_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_tribe_chat_members" ADD CONSTRAINT "survivor_tribe_chat_members_tribeId_fkey" FOREIGN KEY ("tribeId") REFERENCES "survivor_tribes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_players" ADD CONSTRAINT "survivor_players_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_players" ADD CONSTRAINT "survivor_players_tribeId_fkey" FOREIGN KEY ("tribeId") REFERENCES "survivor_tribes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_jury_sessions" ADD CONSTRAINT "survivor_jury_sessions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_jury_votes" ADD CONSTRAINT "survivor_jury_votes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "survivor_jury_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_host_messages" ADD CONSTRAINT "survivor_host_messages_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_chat_channels" ADD CONSTRAINT "survivor_chat_channels_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_tribe_swaps" ADD CONSTRAINT "survivor_tribe_swaps_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_token_pool_picks" ADD CONSTRAINT "survivor_token_pool_picks_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_exile_islands" ADD CONSTRAINT "survivor_exile_islands_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_exile_weekly_entries" ADD CONSTRAINT "survivor_exile_weekly_entries_exileId_fkey" FOREIGN KEY ("exileId") REFERENCES "survivor_exile_islands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_power_balances" ADD CONSTRAINT "survivor_power_balances_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_twist_events" ADD CONSTRAINT "survivor_twist_events_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_audit_entries" ADD CONSTRAINT "survivor_audit_entries_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_game_states" ADD CONSTRAINT "survivor_game_states_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_phase_transitions" ADD CONSTRAINT "survivor_phase_transitions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_notifications" ADD CONSTRAINT "survivor_notifications_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_chat_messages" ADD CONSTRAINT "survivor_chat_messages_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_chat_messages" ADD CONSTRAINT "survivor_chat_messages_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "survivor_chat_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_chat_reactions" ADD CONSTRAINT "survivor_chat_reactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "survivor_chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_commissioner_actions" ADD CONSTRAINT "survivor_commissioner_actions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_season_snapshots" ADD CONSTRAINT "survivor_season_snapshots_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survivor_weekly_scores" ADD CONSTRAINT "survivor_weekly_scores_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "big_brother_league_configs" ADD CONSTRAINT "big_brother_league_configs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "big_brother_cycles" ADD CONSTRAINT "big_brother_cycles_configId_fkey" FOREIGN KEY ("configId") REFERENCES "big_brother_league_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "big_brother_eviction_votes" ADD CONSTRAINT "big_brother_eviction_votes_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "big_brother_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "big_brother_jury_members" ADD CONSTRAINT "big_brother_jury_members_configId_fkey" FOREIGN KEY ("configId") REFERENCES "big_brother_league_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "big_brother_audit_logs" ADD CONSTRAINT "big_brother_audit_logs_configId_fkey" FOREIGN KEY ("configId") REFERENCES "big_brother_league_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "big_brother_chat_command_logs" ADD CONSTRAINT "big_brother_chat_command_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_universes" ADD CONSTRAINT "zombie_universes_commissionedByUserId_fkey" FOREIGN KEY ("commissionedByUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_universes" ADD CONSTRAINT "zombie_universes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_universe_levels" ADD CONSTRAINT "zombie_universe_levels_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "zombie_universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_leagues" ADD CONSTRAINT "zombie_leagues_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "zombie_universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_leagues" ADD CONSTRAINT "zombie_leagues_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "zombie_universe_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_leagues" ADD CONSTRAINT "zombie_leagues_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_whisperer_records" ADD CONSTRAINT "zombie_whisperer_records_zombieLeagueId_fkey" FOREIGN KEY ("zombieLeagueId") REFERENCES "zombie_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_infection_events" ADD CONSTRAINT "zombie_infection_events_zombieLeagueId_fkey" FOREIGN KEY ("zombieLeagueId") REFERENCES "zombie_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_weekly_resolutions" ADD CONSTRAINT "zombie_weekly_resolutions_zombieLeagueId_fkey" FOREIGN KEY ("zombieLeagueId") REFERENCES "zombie_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_universe_stats" ADD CONSTRAINT "zombie_universe_stats_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "zombie_universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_movement_records" ADD CONSTRAINT "zombie_movement_records_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "zombie_universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_announcements" ADD CONSTRAINT "zombie_announcements_zombieLeagueId_fkey" FOREIGN KEY ("zombieLeagueId") REFERENCES "zombie_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_paid_configs" ADD CONSTRAINT "zombie_paid_configs_zombieLeagueId_fkey" FOREIGN KEY ("zombieLeagueId") REFERENCES "zombie_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_rules_documents" ADD CONSTRAINT "zombie_rules_documents_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "zombie_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_audit_entries" ADD CONSTRAINT "zombie_audit_entries_zombieLeagueId_fkey" FOREIGN KEY ("zombieLeagueId") REFERENCES "zombie_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_free_reward_configs" ADD CONSTRAINT "zombie_free_reward_configs_zombieLeagueId_fkey" FOREIGN KEY ("zombieLeagueId") REFERENCES "zombie_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_ambush_actions" ADD CONSTRAINT "zombie_ambush_actions_zombieLeagueId_fkey" FOREIGN KEY ("zombieLeagueId") REFERENCES "zombie_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_league_configs" ADD CONSTRAINT "zombie_league_configs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idp_league_configs" ADD CONSTRAINT "idp_league_configs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynasty_league_configs" ADD CONSTRAINT "dynasty_league_configs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynasty_draft_order_audit_logs" ADD CONSTRAINT "dynasty_draft_order_audit_logs_configId_fkey" FOREIGN KEY ("configId") REFERENCES "dynasty_league_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idp_best_ball_lineup_snapshots" ADD CONSTRAINT "idp_best_ball_lineup_snapshots_configId_fkey" FOREIGN KEY ("configId") REFERENCES "idp_league_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idp_settings_audit_logs" ADD CONSTRAINT "idp_settings_audit_logs_configId_fkey" FOREIGN KEY ("configId") REFERENCES "idp_league_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idp_cap_configs" ADD CONSTRAINT "idp_cap_configs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idp_salary_records" ADD CONSTRAINT "idp_salary_records_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "idp_cap_configs"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idp_salary_records" ADD CONSTRAINT "idp_salary_records_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idp_dead_money" ADD CONSTRAINT "idp_dead_money_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "idp_cap_configs"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idp_dead_money" ADD CONSTRAINT "idp_dead_money_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idp_dead_money" ADD CONSTRAINT "idp_dead_money_salaryRecordId_fkey" FOREIGN KEY ("salaryRecordId") REFERENCES "idp_salary_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idp_cap_projections" ADD CONSTRAINT "idp_cap_projections_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "idp_cap_configs"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idp_cap_projections" ADD CONSTRAINT "idp_cap_projections_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_league_configs" ADD CONSTRAINT "devy_league_configs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_leagues" ADD CONSTRAINT "devy_leagues_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_player_states" ADD CONSTRAINT "devy_player_states_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "devy_leagues"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_player_states" ADD CONSTRAINT "devy_player_states_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_taxi_slots" ADD CONSTRAINT "devy_taxi_slots_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "devy_leagues"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_taxi_slots" ADD CONSTRAINT "devy_taxi_slots_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_devy_slots" ADD CONSTRAINT "devy_devy_slots_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "devy_leagues"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_devy_slots" ADD CONSTRAINT "devy_devy_slots_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_rookie_transitions" ADD CONSTRAINT "devy_rookie_transitions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "devy_leagues"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_rookie_transitions" ADD CONSTRAINT "devy_rookie_transitions_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_draft_picks" ADD CONSTRAINT "devy_draft_picks_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "devy_leagues"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_import_sessions" ADD CONSTRAINT "devy_import_sessions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_import_sessions" ADD CONSTRAINT "devy_import_sessions_commissionerId_fkey" FOREIGN KEY ("commissionerId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_import_sources" ADD CONSTRAINT "devy_import_sources_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "devy_import_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_player_mappings" ADD CONSTRAINT "devy_player_mappings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "devy_import_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_manager_mappings" ADD CONSTRAINT "devy_manager_mappings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "devy_import_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_merge_conflicts" ADD CONSTRAINT "devy_merge_conflicts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "devy_import_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_imported_seasons" ADD CONSTRAINT "devy_imported_seasons_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_imported_seasons" ADD CONSTRAINT "devy_imported_seasons_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "devy_import_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_rights" ADD CONSTRAINT "devy_rights_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_rights" ADD CONSTRAINT "devy_rights_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_lifecycle_events" ADD CONSTRAINT "devy_lifecycle_events_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_commissioner_overrides" ADD CONSTRAINT "devy_commissioner_overrides_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_draft_histories" ADD CONSTRAINT "devy_draft_histories_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devy_best_ball_lineup_snapshots" ADD CONSTRAINT "devy_best_ball_lineup_snapshots_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "c2c_league_configs" ADD CONSTRAINT "c2c_league_configs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "c2c_scoring_logs" ADD CONSTRAINT "c2c_scoring_logs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "c2c_leagues" ADD CONSTRAINT "c2c_leagues_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "c2c_player_states" ADD CONSTRAINT "c2c_player_states_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "c2c_leagues"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "c2c_player_states" ADD CONSTRAINT "c2c_player_states_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "c2c_matchup_scores" ADD CONSTRAINT "c2c_matchup_scores_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "c2c_leagues"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "c2c_matchup_scores" ADD CONSTRAINT "c2c_matchup_scores_matchupId_fkey" FOREIGN KEY ("matchupId") REFERENCES "redraft_matchups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "c2c_draft_picks" ADD CONSTRAINT "c2c_draft_picks_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "c2c_leagues"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "c2c_transition_records" ADD CONSTRAINT "c2c_transition_records_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_league_teams" ADD CONSTRAINT "zombie_league_teams_zombieLeagueId_fkey" FOREIGN KEY ("zombieLeagueId") REFERENCES "zombie_leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_team_items" ADD CONSTRAINT "zombie_team_items_teamStatusId_fkey" FOREIGN KEY ("teamStatusId") REFERENCES "zombie_league_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_infection_logs" ADD CONSTRAINT "zombie_infection_logs_zombieLeagueId_fkey" FOREIGN KEY ("zombieLeagueId") REFERENCES "zombie_leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_resource_ledgers" ADD CONSTRAINT "zombie_resource_ledgers_zombieLeagueId_fkey" FOREIGN KEY ("zombieLeagueId") REFERENCES "zombie_leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_weekly_winnings" ADD CONSTRAINT "zombie_weekly_winnings_zombieLeagueId_fkey" FOREIGN KEY ("zombieLeagueId") REFERENCES "zombie_leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_ambush_events" ADD CONSTRAINT "zombie_ambush_events_zombieLeagueId_fkey" FOREIGN KEY ("zombieLeagueId") REFERENCES "zombie_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_audit_logs" ADD CONSTRAINT "zombie_audit_logs_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "zombie_universes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_audit_logs" ADD CONSTRAINT "zombie_audit_logs_zombieLeagueId_fkey" FOREIGN KEY ("zombieLeagueId") REFERENCES "zombie_leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_template_slots" ADD CONSTRAINT "roster_template_slots_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "roster_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_rules" ADD CONSTRAINT "scoring_rules_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "scoring_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiver_claims" ADD CONSTRAINT "waiver_claims_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiver_claims" ADD CONSTRAINT "waiver_claims_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiver_transactions" ADD CONSTRAINT "waiver_transactions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiver_transactions" ADD CONSTRAINT "waiver_transactions_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiver_pickups" ADD CONSTRAINT "waiver_pickups_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiver_pickups" ADD CONSTRAINT "waiver_pickups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleeper_leagues" ADD CONSTRAINT "sleeper_leagues_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleeper_rosters" ADD CONSTRAINT "sleeper_rosters_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "sleeper_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_drafts" ADD CONSTRAINT "mock_drafts_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_drafts" ADD CONSTRAINT "mock_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_draft_chats" ADD CONSTRAINT "mock_draft_chats_mockDraftId_fkey" FOREIGN KEY ("mockDraftId") REFERENCES "mock_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_sessions" ADD CONSTRAINT "draft_sessions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_picks" ADD CONSTRAINT "draft_picks_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "draft_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_pick_trade_proposals" ADD CONSTRAINT "draft_pick_trade_proposals_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "draft_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_queues" ADD CONSTRAINT "draft_queues_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "draft_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_queue_entries" ADD CONSTRAINT "draft_queue_entries_draftSessionId_fkey" FOREIGN KEY ("draftSessionId") REFERENCES "draft_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_chat_messages" ADD CONSTRAINT "draft_chat_messages_draftSessionId_fkey" FOREIGN KEY ("draftSessionId") REFERENCES "draft_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_retrospectives" ADD CONSTRAINT "draft_retrospectives_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "draft_prediction_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_chat_threads" ADD CONSTRAINT "platform_chat_threads_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_chat_thread_members" ADD CONSTRAINT "platform_chat_thread_members_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "platform_chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_chat_thread_members" ADD CONSTRAINT "platform_chat_thread_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_chat_messages" ADD CONSTRAINT "platform_chat_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "platform_chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_chat_messages" ADD CONSTRAINT "platform_chat_messages_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_notifications" ADD CONSTRAINT "platform_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "web_push_subscriptions" ADD CONSTRAINT "web_push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_events" ADD CONSTRAINT "engagement_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "podcast_episodes" ADD CONSTRAINT "podcast_episodes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_media_episodes" ADD CONSTRAINT "fantasy_media_episodes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_media_publish_logs" ADD CONSTRAINT "fantasy_media_publish_logs_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "fantasy_media_episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_clips" ADD CONSTRAINT "social_clips_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_content_assets" ADD CONSTRAINT "social_content_assets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_publish_targets" ADD CONSTRAINT "social_publish_targets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_publish_logs" ADD CONSTRAINT "social_publish_logs_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "social_content_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shareable_moments" ADD CONSTRAINT "shareable_moments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_publish_logs" ADD CONSTRAINT "share_publish_logs_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "shareable_moments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_blocked_users" ADD CONSTRAINT "platform_blocked_users_blockerUserId_fkey" FOREIGN KEY ("blockerUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_blocked_users" ADD CONSTRAINT "platform_blocked_users_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_message_reports" ADD CONSTRAINT "platform_message_reports_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_user_reports" ADD CONSTRAINT "platform_user_reports_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_user_reports" ADD CONSTRAINT "platform_user_reports_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_token_balances" ADD CONSTRAINT "user_token_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_userTokenBalanceId_fkey" FOREIGN KEY ("userTokenBalanceId") REFERENCES "user_token_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_tokenPackageSku_fkey" FOREIGN KEY ("tokenPackageSku") REFERENCES "token_packages"("sku") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_spendRuleCode_fkey" FOREIGN KEY ("spendRuleCode") REFERENCES "token_spend_rules"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_refundRuleCode_fkey" FOREIGN KEY ("refundRuleCode") REFERENCES "token_refund_rules"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_wallet_accounts" ADD CONSTRAINT "platform_wallet_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_walletAccountId_fkey" FOREIGN KEY ("walletAccountId") REFERENCES "platform_wallet_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_draft_rooms" ADD CONSTRAINT "mock_draft_rooms_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_room_pick_records" ADD CONSTRAINT "draft_room_pick_records_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "mock_draft_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_room_user_queues" ADD CONSTRAINT "draft_room_user_queues_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_room_chat_messages" ADD CONSTRAINT "draft_room_chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_autopick_settings" ADD CONSTRAINT "draft_autopick_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_seasons" ADD CONSTRAINT "redraft_seasons_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_rosters" ADD CONSTRAINT "redraft_rosters_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_roster_players" ADD CONSTRAINT "redraft_roster_players_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_matchups" ADD CONSTRAINT "redraft_matchups_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_matchups" ADD CONSTRAINT "redraft_matchups_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_matchups" ADD CONSTRAINT "redraft_matchups_homeRosterId_fkey" FOREIGN KEY ("homeRosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_matchups" ADD CONSTRAINT "redraft_matchups_awayRosterId_fkey" FOREIGN KEY ("awayRosterId") REFERENCES "redraft_rosters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_waiver_claims" ADD CONSTRAINT "redraft_waiver_claims_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_waiver_claims" ADD CONSTRAINT "redraft_waiver_claims_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_waiver_claims" ADD CONSTRAINT "redraft_waiver_claims_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_league_trades" ADD CONSTRAINT "redraft_league_trades_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_league_trades" ADD CONSTRAINT "redraft_league_trades_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_league_trades" ADD CONSTRAINT "redraft_league_trades_proposerRosterId_fkey" FOREIGN KEY ("proposerRosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_league_trades" ADD CONSTRAINT "redraft_league_trades_receiverRosterId_fkey" FOREIGN KEY ("receiverRosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_league_transactions" ADD CONSTRAINT "redraft_league_transactions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_league_transactions" ADD CONSTRAINT "redraft_league_transactions_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_league_transactions" ADD CONSTRAINT "redraft_league_transactions_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_playoff_brackets" ADD CONSTRAINT "redraft_playoff_brackets_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_ai_league_insights" ADD CONSTRAINT "redraft_ai_league_insights_redraftSeasonId_fkey" FOREIGN KEY ("redraftSeasonId") REFERENCES "redraft_seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redraft_ai_roster_insights" ADD CONSTRAINT "redraft_ai_roster_insights_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keeper_records" ADD CONSTRAINT "keeper_records_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keeper_records" ADD CONSTRAINT "keeper_records_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keeper_records" ADD CONSTRAINT "keeper_records_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keeper_selection_sessions" ADD CONSTRAINT "keeper_selection_sessions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keeper_selection_sessions" ADD CONSTRAINT "keeper_selection_sessions_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keeper_eligibilities" ADD CONSTRAINT "keeper_eligibilities_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keeper_eligibilities" ADD CONSTRAINT "keeper_eligibilities_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keeper_pick_adjustments" ADD CONSTRAINT "keeper_pick_adjustments_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keeper_pick_adjustments" ADD CONSTRAINT "keeper_pick_adjustments_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keeper_pick_adjustments" ADD CONSTRAINT "keeper_pick_adjustments_keeperRecordId_fkey" FOREIGN KEY ("keeperRecordId") REFERENCES "keeper_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keeper_audit_logs" ADD CONSTRAINT "keeper_audit_logs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keeper_audit_logs" ADD CONSTRAINT "keeper_audit_logs_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "best_ball_optimized_lineups" ADD CONSTRAINT "best_ball_optimized_lineups_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "best_ball_optimized_lineups" ADD CONSTRAINT "best_ball_optimized_lineups_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "best_ball_optimized_lineups" ADD CONSTRAINT "best_ball_optimized_lineups_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "best_ball_optimized_lineups" ADD CONSTRAINT "best_ball_optimized_lineups_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "best_ball_contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "best_ball_optimized_lineups" ADD CONSTRAINT "best_ball_optimized_lineups_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "best_ball_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "best_ball_pods" ADD CONSTRAINT "best_ball_pods_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "best_ball_contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "best_ball_entries" ADD CONSTRAINT "best_ball_entries_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "best_ball_contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "best_ball_entries" ADD CONSTRAINT "best_ball_entries_podId_fkey" FOREIGN KEY ("podId") REFERENCES "best_ball_pods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "best_ball_roster_validations" ADD CONSTRAINT "best_ball_roster_validations_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "best_ball_ai_insights" ADD CONSTRAINT "best_ball_ai_insights_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "best_ball_ai_insights" ADD CONSTRAINT "best_ball_ai_insights_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "best_ball_contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guillotine_seasons" ADD CONSTRAINT "guillotine_seasons_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guillotine_seasons" ADD CONSTRAINT "guillotine_seasons_redraftSeasonId_fkey" FOREIGN KEY ("redraftSeasonId") REFERENCES "redraft_seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guillotine_eliminations" ADD CONSTRAINT "guillotine_eliminations_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "guillotine_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guillotine_survival_logs" ADD CONSTRAINT "guillotine_survival_logs_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "guillotine_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guillotine_survival_logs" ADD CONSTRAINT "guillotine_survival_logs_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guillotine_waiver_releases" ADD CONSTRAINT "guillotine_waiver_releases_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "guillotine_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guillotine_ai_insights" ADD CONSTRAINT "guillotine_ai_insights_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guillotine_ai_insights" ADD CONSTRAINT "guillotine_ai_insights_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "guillotine_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

