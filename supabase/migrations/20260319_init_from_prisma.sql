-- CreateEnum
CREATE TYPE "FeedbackReason" AS ENUM ('OVERVALUED', 'TOO_RISKY', 'NOT_MY_STYLE', 'BAD_ROSTER_FIT', 'OTHER');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('UP', 'DOWN');

-- CreateEnum
CREATE TYPE "TradeOfferMode" AS ENUM ('INSTANT', 'STRUCTURED', 'TRADE_HUB', 'TRADE_IDEAS', 'PROPOSAL_GENERATOR');

-- CreateEnum
CREATE TYPE "TradeOutcome" AS ENUM ('ACCEPTED', 'REJECTED', 'EXPIRED', 'COUNTERED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "LeagueSport" AS ENUM ('NFL', 'NHL', 'MLB', 'NBA', 'NCAAF', 'NCAAB', 'SOCCER');

-- CreateTable
CREATE TABLE "EarlyAccessSignup" (
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
CREATE TABLE "VisitorLocation" (
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
CREATE TABLE "QuestionnaireResponse" (
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
CREATE TABLE "SportsDataCache" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SportsDataCache_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SportsTeam" (
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
CREATE TABLE "SportsPlayer" (
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
CREATE TABLE "PlayerIdentityMap" (
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
CREATE TABLE "player_team_history" (
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
CREATE TABLE "SportsGame" (
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
CREATE TABLE "SportsInjury" (
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
CREATE TABLE "SportsNews" (
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
CREATE TABLE "LegacyUser" (
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
CREATE TABLE "UserEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legacy_user_rank_cache" (
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

    CONSTRAINT "legacy_user_rank_cache_pkey" PRIMARY KEY ("legacy_user_id")
);

-- CreateTable
CREATE TABLE "LegacyImportJob" (
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
CREATE TABLE "LegacyLeague" (
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
CREATE TABLE "LegacyRoster" (
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
CREATE TABLE "LegacySeasonSummary" (
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
CREATE TABLE "LegacyAIReport" (
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
CREATE TABLE "AnalyticsEvent" (
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
CREATE TABLE "TradeNotification" (
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
CREATE TABLE "EmailPreference" (
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
CREATE TABLE "AIUserProfile" (
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
CREATE TABLE "trade_suggestion_votes" (
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
CREATE TABLE "trade_feedback" (
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
CREATE TABLE "trade_profiles" (
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
CREATE TABLE "AILeagueContext" (
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
CREATE TABLE "AITeamStateSnapshot" (
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
CREATE TABLE "ai_memories" (
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
CREATE TABLE "AIMemoryEvent" (
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
CREATE TABLE "AIUserFeedback" (
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
CREATE TABLE "TradeFeedback" (
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
CREATE TABLE "TradePreferences" (
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
CREATE TABLE "LeagueTradeHistory" (
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
CREATE TABLE "LeagueTrade" (
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
CREATE TABLE "TradeLearningInsight" (
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
CREATE TABLE "TradeLearningStats" (
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
CREATE TABLE "TradePreAnalysisCache" (
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
CREATE TABLE "LeagueTypeSubmission" (
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
CREATE TABLE "LegacyFeedback" (
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
CREATE TABLE "YahooConnection" (
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
CREATE TABLE "YahooLeague" (
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
CREATE TABLE "YahooTeam" (
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
CREATE TABLE "MFLConnection" (
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
CREATE TABLE "InsightEvent" (
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
CREATE TABLE "AIIssue" (
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
CREATE TABLE "AIIssueFeedback" (
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
CREATE TABLE "FantraxUser" (
    "id" TEXT NOT NULL,
    "fantraxUsername" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FantraxUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FantraxLeague" (
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
CREATE TABLE "manager_trade_tendencies" (
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
CREATE TABLE "user_trade_reputation" (
    "user_id" TEXT NOT NULL,
    "trades_sent" INTEGER DEFAULT 0,
    "trades_accepted" INTEGER DEFAULT 0,
    "avg_value_delta" DOUBLE PRECISION DEFAULT 1.0,
    "reputation" TEXT DEFAULT 'Fair Dealer',
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_trade_reputation_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "SleeperImportCache" (
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
CREATE TABLE "trade_block_entries" (
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
CREATE TABLE "trade_analysis_snapshots" (
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
CREATE TABLE "share_rewards" (
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
CREATE TABLE "decision_logs" (
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
CREATE TABLE "decision_outcomes" (
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
CREATE TABLE "TradeOfferEvent" (
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
CREATE TABLE "TradeOutcomeEvent" (
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
CREATE TABLE "ModelMetricsDaily" (
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
CREATE TABLE "LearnedWeights" (
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
CREATE TABLE "RankingWeightsWeekly" (
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
CREATE TABLE "LeagueDemandWeekly" (
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
CREATE TABLE "NarrativeValidationLog" (
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
CREATE TABLE "manager_dna" (
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
CREATE TABLE "opponent_tendencies" (
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
CREATE TABLE "strategy_snapshots" (
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
CREATE TABLE "player_season_stats" (
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
CREATE TABLE "trending_players" (
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
CREATE TABLE "depth_charts" (
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
CREATE TABLE "team_season_stats" (
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
CREATE TABLE "ProviderSyncState" (
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
CREATE TABLE "AiOutput" (
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
CREATE TABLE "guardian_interventions" (
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
CREATE TABLE "ai_insights" (
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
CREATE TABLE "ai_badges" (
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
CREATE TABLE "simulation_runs" (
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
CREATE TABLE "chat_conversations" (
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
CREATE TABLE "WeeklyMatchup" (
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
CREATE TABLE "rankings_snapshots" (
    "id" BIGSERIAL NOT NULL,
    "leagueId" TEXT NOT NULL,
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
CREATE TABLE "rankings_weights_snapshot" (
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
CREATE TABLE "season_results" (
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
CREATE TABLE "draft_grades" (
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
CREATE TABLE "hall_of_fame" (
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
CREATE TABLE "hall_of_fame_entries" (
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
CREATE TABLE "hall_of_fame_moments" (
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
CREATE TABLE "legacy_score_records" (
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
CREATE TABLE "legacy_evidence_records" (
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
CREATE TABLE "ApiUsageEvent" (
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
CREATE TABLE "ApiUsageRollup" (
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
CREATE TABLE "Player" (
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
CREATE TABLE "DevyPlayer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "conference" TEXT,
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
    "nilImpactScore" DOUBLE PRECISION,
    "injurySeverityScore" DOUBLE PRECISION,
    "athleticProfileScore" DOUBLE PRECISION,
    "productionIndex" DOUBLE PRECISION,
    "volatilityScore" DOUBLE PRECISION,
    "nflDraftRound" INTEGER,
    "nflDraftPick" INTEGER,
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
CREATE TABLE "DevyAdp" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "adp" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevyAdp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RookieClass" (
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
CREATE TABLE "TradeOutcomeTraining" (
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
CREATE TABLE "TradeShare" (
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
CREATE TABLE "EngineSnapshot" (
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
CREATE TABLE "PlayerAnalyticsSnapshot" (
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
CREATE TABLE "app_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "username" TEXT NOT NULL,
    "passwordHash" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legacyUserId" TEXT,
    "activeLeagueId" TEXT,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_attributions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" VARCHAR(32) NOT NULL,
    "sourceId" VARCHAR(128),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "growth_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_links" (
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
CREATE TABLE "invite_link_events" (
    "id" TEXT NOT NULL,
    "inviteLinkId" TEXT NOT NULL,
    "eventType" VARCHAR(32) NOT NULL,
    "channel" VARCHAR(24),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_link_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    "displayName" VARCHAR(128),
    "bio" TEXT,
    "avatarUrl" VARCHAR(512),
    "bannerUrl" VARCHAR(512),
    "websiteUrl" VARCHAR(512),
    "socialHandles" JSONB,
    "verifiedAt" TIMESTAMP(3),
    "verificationBadge" VARCHAR(32),
    "visibility" VARCHAR(16) NOT NULL DEFAULT 'public',
    "branding" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_leagues" (
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_invites" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "creatorLeagueId" TEXT,
    "code" VARCHAR(32) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER NOT NULL DEFAULT 0,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_league_members" (
    "id" TEXT NOT NULL,
    "creatorLeagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedViaCode" VARCHAR(32),

    CONSTRAINT "creator_league_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_analytics_events" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "eventType" VARCHAR(32) NOT NULL,
    "leagueId" VARCHAR(64),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_events" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT,
    "type" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_rewards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),

    CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_accounts" (
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
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "BracketTournament" (
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
CREATE TABLE "BracketNode" (
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
CREATE TABLE "BracketLeague" (
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
CREATE TABLE "BracketLeagueMember" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BracketLeagueMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BracketEntry" (
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
CREATE TABLE "BracketEntrySnapshot" (
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
CREATE TABLE "bracket_pick_popularity" (
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
CREATE TABLE "bracket_simulation_snapshot" (
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
CREATE TABLE "bracket_leaderboards" (
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
CREATE TABLE "bracket_health_snapshots" (
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
CREATE TABLE "BracketPick" (
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
CREATE TABLE "bracket_league_messages" (
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
CREATE TABLE "bracket_message_reactions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bracket_message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BracketPayment" (
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
CREATE TABLE "bracket_feed_events" (
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
CREATE TABLE "bracket_risk_profiles" (
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
CREATE TABLE "simulation_results" (
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
CREATE TABLE "bracket_challenges" (
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
CREATE TABLE "user_follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
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
CREATE TABLE "reaction_events" (
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
CREATE TABLE "user_rivalries" (
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
CREATE TABLE "rivalry_records" (
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
CREATE TABLE "rivalry_events" (
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
CREATE TABLE "manager_psych_profiles" (
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
CREATE TABLE "profile_evidence_records" (
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
CREATE TABLE "drama_events" (
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
CREATE TABLE "drama_timeline_records" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "season" INTEGER,
    "eventIds" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drama_timeline_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manager_reputation_records" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
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
CREATE TABLE "reputation_evidence_records" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "evidenceType" VARCHAR(64) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourceReference" VARCHAR(256),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_evidence_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manager_franchise_profiles" (
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
CREATE TABLE "gm_progression_events" (
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
CREATE TABLE "manager_xp_profiles" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "currentTier" VARCHAR(32) NOT NULL,
    "xpToNextTier" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_xp_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_events" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "xpValue" INTEGER NOT NULL DEFAULT 0,
    "sport" VARCHAR(16) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "award_records" (
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
CREATE TABLE "record_book_entries" (
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
CREATE TABLE "manager_wallets" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "currencyBalance" INTEGER NOT NULL DEFAULT 0,
    "earnedLifetime" INTEGER NOT NULL DEFAULT 0,
    "spentLifetime" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_items" (
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
CREATE TABLE "purchase_records" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "itemId" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_articles" (
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
CREATE TABLE "blog_articles" (
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
CREATE TABLE "blog_publish_logs" (
    "publishId" TEXT NOT NULL,
    "articleId" VARCHAR(64) NOT NULL,
    "actionType" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_publish_logs_pkey" PRIMARY KEY ("publishId")
);

-- CreateTable
CREATE TABLE "broadcast_sessions" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(128),

    CONSTRAINT "broadcast_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commentary_entries" (
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
CREATE TABLE "user_profiles" (
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
    "avatarPreset" TEXT,
    "bio" TEXT,
    "preferredSports" JSONB,
    "notificationPreferences" JSONB,
    "onboardingStep" TEXT,
    "onboardingCompletedAt" TIMESTAMP(3),
    "retentionNudgeDismissedAt" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "pending_signups" (
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_signups_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "email_verify_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verify_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leagues" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platformLeagueId" TEXT NOT NULL,
    "name" TEXT,
    "sport" "LeagueSport" NOT NULL DEFAULT 'NFL',
    "leagueVariant" VARCHAR(32),
    "season" INTEGER,
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
    "legacyLeagueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_templates" (
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
CREATE TABLE "tournaments" (
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
CREATE TABLE "tournament_conferences" (
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
CREATE TABLE "tournament_leagues" (
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
CREATE TABLE "tournament_rounds" (
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
CREATE TABLE "tournament_announcements" (
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
CREATE TABLE "tournament_audit_logs" (
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
CREATE TABLE "tournament_participants" (
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
CREATE TABLE "league_chat_messages" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(32) NOT NULL DEFAULT 'text',
    "imageUrl" TEXT,
    "metadata" JSONB,
    "source" VARCHAR(16),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rosters" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "playerData" JSONB NOT NULL,
    "faabRemaining" INTEGER,
    "waiverPriority" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_teams" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "avatarUrl" TEXT,
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
CREATE TABLE "league_divisions" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "tierLevel" INTEGER NOT NULL DEFAULT 1,
    "sport" VARCHAR(16) NOT NULL,
    "name" VARCHAR(128),

    CONSTRAINT "league_divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_rules" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "fromTierLevel" INTEGER NOT NULL DEFAULT 1,
    "toTierLevel" INTEGER NOT NULL DEFAULT 2,
    "promoteCount" INTEGER NOT NULL DEFAULT 1,
    "relegateCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "promotion_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_performances" (
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
CREATE TABLE "league_auths" (
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
CREATE TABLE "league_waiver_settings" (
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
CREATE TABLE "guillotine_league_configs" (
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
CREATE TABLE "guillotine_roster_states" (
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
CREATE TABLE "guillotine_period_scores" (
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
CREATE TABLE "guillotine_event_logs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guillotine_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_cap_league_configs" (
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
CREATE TABLE "salary_cap_team_ledgers" (
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
CREATE TABLE "player_contracts" (
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
CREATE TABLE "salary_cap_event_logs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_cap_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_cap_lottery_results" (
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
CREATE TABLE "survivor_league_configs" (
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
CREATE TABLE "survivor_tribes" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "slotIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survivor_tribes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survivor_tribe_members" (
    "id" TEXT NOT NULL,
    "tribeId" TEXT NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_tribe_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survivor_idols" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "playerId" VARCHAR(64) NOT NULL,
    "powerType" VARCHAR(64) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'hidden',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "validUntilPhase" VARCHAR(32),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survivor_idols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survivor_idol_ledger_entries" (
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
CREATE TABLE "survivor_tribal_councils" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "phase" VARCHAR(24) NOT NULL,
    "attendingTribeId" VARCHAR(64),
    "voteDeadlineAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "eliminatedRosterId" VARCHAR(64),
    "tieBreakSeasonPoints" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survivor_tribal_councils_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survivor_votes" (
    "id" TEXT NOT NULL,
    "councilId" TEXT NOT NULL,
    "voterRosterId" VARCHAR(64) NOT NULL,
    "targetRosterId" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survivor_exile_leagues" (
    "id" TEXT NOT NULL,
    "mainLeagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "exileLeagueId" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_exile_leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survivor_exile_tokens" (
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
CREATE TABLE "survivor_jury_members" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "votedOutWeek" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_jury_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survivor_audit_logs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survivor_challenges" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "challengeType" VARCHAR(64) NOT NULL,
    "configJson" JSONB,
    "lockAt" TIMESTAMP(3),
    "resultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survivor_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survivor_challenge_submissions" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "rosterId" VARCHAR(64),
    "tribeId" VARCHAR(64),
    "submission" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_challenge_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survivor_tribe_chat_members" (
    "id" TEXT NOT NULL,
    "tribeId" TEXT NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "userId" VARCHAR(64),
    "isAiHost" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_tribe_chat_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "big_brother_league_configs" (
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
CREATE TABLE "big_brother_cycles" (
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "big_brother_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "big_brother_eviction_votes" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "voterRosterId" VARCHAR(64) NOT NULL,
    "targetRosterId" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "big_brother_eviction_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "big_brother_jury_members" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "evictedWeek" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "big_brother_jury_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "big_brother_finale_votes" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "juryRosterId" VARCHAR(64) NOT NULL,
    "targetRosterId" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "big_brother_finale_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "big_brother_audit_logs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "big_brother_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zombie_universes" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "sport" VARCHAR(12) NOT NULL DEFAULT 'NFL',
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zombie_universes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zombie_universe_levels" (
    "id" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "rankOrder" INTEGER NOT NULL DEFAULT 1,
    "leagueCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zombie_universe_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zombie_leagues" (
    "id" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128),
    "orderInLevel" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zombie_leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zombie_league_configs" (
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
CREATE TABLE "idp_league_configs" (
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
CREATE TABLE "dynasty_league_configs" (
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
CREATE TABLE "dynasty_draft_order_audit_logs" (
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
CREATE TABLE "idp_player_eligibility" (
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
CREATE TABLE "idp_best_ball_lineup_snapshots" (
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
CREATE TABLE "idp_settings_audit_logs" (
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
CREATE TABLE "devy_league_configs" (
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
    "taxiSize" INTEGER NOT NULL DEFAULT 6,
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
CREATE TABLE "devy_rights" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "devyPlayerId" VARCHAR(64) NOT NULL,
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
CREATE TABLE "devy_lifecycle_events" (
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
CREATE TABLE "devy_commissioner_overrides" (
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
CREATE TABLE "devy_draft_histories" (
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
CREATE TABLE "devy_class_strength_snapshots" (
    "id" TEXT NOT NULL,
    "sport" VARCHAR(8) NOT NULL,
    "seasonYear" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devy_class_strength_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devy_best_ball_lineup_snapshots" (
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
CREATE TABLE "c2c_league_configs" (
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
CREATE TABLE "zombie_league_teams" (
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

    CONSTRAINT "zombie_league_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zombie_infection_logs" (
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
CREATE TABLE "zombie_resource_ledgers" (
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
CREATE TABLE "zombie_resource_ledger_entries" (
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
CREATE TABLE "zombie_weekly_winnings" (
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
CREATE TABLE "zombie_movement_projections" (
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
CREATE TABLE "zombie_ambush_events" (
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
CREATE TABLE "zombie_audit_logs" (
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
CREATE TABLE "roster_templates" (
    "id" TEXT NOT NULL,
    "sportType" VARCHAR(12) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "formatType" VARCHAR(32) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roster_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_template_slots" (
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
CREATE TABLE "league_roster_configs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "templateId" TEXT NOT NULL,
    "overrides" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_roster_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_templates" (
    "id" TEXT NOT NULL,
    "sportType" VARCHAR(12) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "formatType" VARCHAR(32) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scoring_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_rules" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "statKey" VARCHAR(48) NOT NULL,
    "pointsValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "scoring_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_scoring_overrides" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "statKey" VARCHAR(48) NOT NULL,
    "pointsValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "league_scoring_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sport_feature_flags" (
    "id" TEXT NOT NULL,
    "sportType" VARCHAR(12) NOT NULL,
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
CREATE TABLE "schedule_templates" (
    "id" TEXT NOT NULL,
    "sportType" VARCHAR(12) NOT NULL,
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
CREATE TABLE "season_calendars" (
    "id" TEXT NOT NULL,
    "sportType" VARCHAR(12) NOT NULL,
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
CREATE TABLE "game_schedules" (
    "id" TEXT NOT NULL,
    "sportType" VARCHAR(12) NOT NULL,
    "season" INTEGER NOT NULL,
    "weekOrRound" INTEGER NOT NULL,
    "externalId" VARCHAR(64) NOT NULL,
    "homeTeamId" VARCHAR(32),
    "awayTeamId" VARCHAR(32),
    "homeTeam" VARCHAR(16),
    "awayTeam" VARCHAR(16),
    "startTime" TIMESTAMP(3),
    "status" VARCHAR(24) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_game_stats" (
    "id" TEXT NOT NULL,
    "playerId" VARCHAR(64) NOT NULL,
    "sportType" VARCHAR(12) NOT NULL,
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
CREATE TABLE "team_game_stats" (
    "id" TEXT NOT NULL,
    "sportType" VARCHAR(12) NOT NULL,
    "gameId" VARCHAR(64) NOT NULL,
    "teamId" VARCHAR(32) NOT NULL,
    "season" INTEGER NOT NULL,
    "weekOrRound" INTEGER NOT NULL,
    "stat_payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_game_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stat_ingestion_jobs" (
    "id" TEXT NOT NULL,
    "sportType" VARCHAR(12) NOT NULL,
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
CREATE TABLE "player_meta_trends" (
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
CREATE TABLE "trend_signal_events" (
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
CREATE TABLE "strategy_meta_reports" (
    "id" TEXT NOT NULL,
    "strategyType" VARCHAR(32) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "usageRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trendingDirection" VARCHAR(16) NOT NULL,
    "leagueFormat" VARCHAR(32) NOT NULL,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_meta_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_meta_snapshots" (
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
CREATE TABLE "position_meta_trends" (
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
CREATE TABLE "waiver_claims" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
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
CREATE TABLE "waiver_transactions" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
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
CREATE TABLE "waiver_pickups" (
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
CREATE TABLE "sleeper_leagues" (
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
CREATE TABLE "sleeper_rosters" (
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
CREATE TABLE "RookieRanking" (
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
CREATE TABLE "mock_drafts" (
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
CREATE TABLE "mock_draft_chats" (
    "id" TEXT NOT NULL,
    "mockDraftId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mock_draft_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_sessions" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
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
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_picks" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
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
    "tradedPickMeta" JSONB,
    "source" TEXT DEFAULT 'user',
    "amount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_pick_trade_proposals" (
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
CREATE TABLE "ai_manager_audit_log" (
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
CREATE TABLE "draft_queues" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "order" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_import_backups" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_import_backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rankings_backtest_results" (
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
CREATE TABLE "draft_prediction_snapshots" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
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
CREATE TABLE "draft_retrospectives" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
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
CREATE TABLE "league_draft_calibrations" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
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
CREATE TABLE "ai_adp_snapshots" (
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
CREATE TABLE "share_engagements" (
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
CREATE TABLE "platform_chat_threads" (
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
CREATE TABLE "platform_chat_thread_members" (
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
CREATE TABLE "platform_chat_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderUserId" TEXT,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_notifications" (
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
CREATE TABLE "web_push_subscriptions" (
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
CREATE TABLE "engagement_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "podcast_episodes" (
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
CREATE TABLE "fantasy_media_episodes" (
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
CREATE TABLE "fantasy_media_publish_logs" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "destinationType" VARCHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "responseMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fantasy_media_publish_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_clips" (
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
CREATE TABLE "social_content_assets" (
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
CREATE TABLE "social_publish_targets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" VARCHAR(32) NOT NULL,
    "accountIdentifier" VARCHAR(256),
    "autoPostingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_publish_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_publish_logs" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "platform" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "responseMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_publish_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shareable_moments" (
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
CREATE TABLE "share_publish_logs" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "platform" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "responseMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_publish_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_blocked_users" (
    "id" TEXT NOT NULL,
    "blockerUserId" TEXT NOT NULL,
    "blockedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_blocked_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_message_reports" (
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
CREATE TABLE "platform_user_reports" (
    "id" TEXT NOT NULL,
    "reportedUserId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_user_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_moderation_actions" (
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
CREATE TABLE "admin_audit_log" (
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
CREATE TABLE "platform_wallet_accounts" (
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
CREATE TABLE "wallet_ledger_entries" (
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
CREATE TABLE "season_forecast_snapshots" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "teamForecasts" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_forecast_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynasty_projection_snapshots" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
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
CREATE TABLE "player_career_projections" (
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
CREATE TABLE "team_window_profiles" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
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
CREATE TABLE "graph_nodes" (
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
CREATE TABLE "graph_edges" (
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
CREATE TABLE "league_graph_snapshots" (
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
CREATE TABLE "league_dynasty_seasons" (
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
CREATE TABLE "dynasty_backfill_status" (
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
CREATE TABLE "dw_player_game_facts" (
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
CREATE TABLE "dw_team_game_facts" (
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
CREATE TABLE "dw_roster_snapshots" (
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
CREATE TABLE "dw_matchup_facts" (
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
CREATE TABLE "dw_draft_facts" (
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
CREATE TABLE "dw_transaction_facts" (
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
CREATE TABLE "dw_season_standing_facts" (
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
CREATE TABLE "sim_matchup_results" (
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
CREATE TABLE "sim_season_results" (
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
CREATE TABLE "dynasty_projections" (
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
CREATE TABLE "platform_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EarlyAccessSignup_email_key" ON "EarlyAccessSignup"("email");

-- CreateIndex
CREATE INDEX "EarlyAccessSignup_createdAt_idx" ON "EarlyAccessSignup"("createdAt");

-- CreateIndex
CREATE INDEX "EarlyAccessSignup_confirmedAt_idx" ON "EarlyAccessSignup"("confirmedAt");

-- CreateIndex
CREATE INDEX "EarlyAccessSignup_source_idx" ON "EarlyAccessSignup"("source");

-- CreateIndex
CREATE INDEX "EarlyAccessSignup_utmSource_idx" ON "EarlyAccessSignup"("utmSource");

-- CreateIndex
CREATE UNIQUE INDEX "VisitorLocation_ipAddress_key" ON "VisitorLocation"("ipAddress");

-- CreateIndex
CREATE INDEX "VisitorLocation_country_idx" ON "VisitorLocation"("country");

-- CreateIndex
CREATE INDEX "VisitorLocation_lastSeen_idx" ON "VisitorLocation"("lastSeen");

-- CreateIndex
CREATE INDEX "QuestionnaireResponse_email_idx" ON "QuestionnaireResponse"("email");

-- CreateIndex
CREATE INDEX "SportsDataCache_expiresAt_idx" ON "SportsDataCache"("expiresAt");

-- CreateIndex
CREATE INDEX "SportsTeam_sport_idx" ON "SportsTeam"("sport");

-- CreateIndex
CREATE UNIQUE INDEX "SportsTeam_sport_externalId_source_key" ON "SportsTeam"("sport", "externalId", "source");

-- CreateIndex
CREATE INDEX "SportsPlayer_sport_team_idx" ON "SportsPlayer"("sport", "team");

-- CreateIndex
CREATE INDEX "SportsPlayer_sleeperId_idx" ON "SportsPlayer"("sleeperId");

-- CreateIndex
CREATE INDEX "SportsPlayer_name_idx" ON "SportsPlayer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SportsPlayer_sport_externalId_source_key" ON "SportsPlayer"("sport", "externalId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerIdentityMap_sleeperId_key" ON "PlayerIdentityMap"("sleeperId");

-- CreateIndex
CREATE INDEX "PlayerIdentityMap_normalizedName_idx" ON "PlayerIdentityMap"("normalizedName");

-- CreateIndex
CREATE INDEX "PlayerIdentityMap_fantasyCalcId_idx" ON "PlayerIdentityMap"("fantasyCalcId");

-- CreateIndex
CREATE INDEX "PlayerIdentityMap_rollingInsightsId_idx" ON "PlayerIdentityMap"("rollingInsightsId");

-- CreateIndex
CREATE INDEX "PlayerIdentityMap_apiSportsId_idx" ON "PlayerIdentityMap"("apiSportsId");

-- CreateIndex
CREATE INDEX "PlayerIdentityMap_espnId_idx" ON "PlayerIdentityMap"("espnId");

-- CreateIndex
CREATE INDEX "PlayerIdentityMap_clearSportsId_idx" ON "PlayerIdentityMap"("clearSportsId");

-- CreateIndex
CREATE INDEX "PlayerIdentityMap_currentTeam_idx" ON "PlayerIdentityMap"("currentTeam");

-- CreateIndex
CREATE INDEX "PlayerIdentityMap_sport_position_idx" ON "PlayerIdentityMap"("sport", "position");

-- CreateIndex
CREATE INDEX "player_team_history_playerId_sport_season_idx" ON "player_team_history"("playerId", "sport", "season");

-- CreateIndex
CREATE INDEX "player_team_history_teamAbbr_sport_season_idx" ON "player_team_history"("teamAbbr", "sport", "season");

-- CreateIndex
CREATE UNIQUE INDEX "player_team_history_playerId_sport_season_week_key" ON "player_team_history"("playerId", "sport", "season", "week");

-- CreateIndex
CREATE INDEX "SportsGame_sport_startTime_idx" ON "SportsGame"("sport", "startTime");

-- CreateIndex
CREATE INDEX "SportsGame_sport_season_week_idx" ON "SportsGame"("sport", "season", "week");

-- CreateIndex
CREATE UNIQUE INDEX "SportsGame_sport_externalId_source_key" ON "SportsGame"("sport", "externalId", "source");

-- CreateIndex
CREATE INDEX "SportsInjury_sport_team_idx" ON "SportsInjury"("sport", "team");

-- CreateIndex
CREATE INDEX "SportsInjury_playerName_idx" ON "SportsInjury"("playerName");

-- CreateIndex
CREATE INDEX "SportsInjury_playerId_idx" ON "SportsInjury"("playerId");

-- CreateIndex
CREATE INDEX "SportsInjury_sport_season_week_idx" ON "SportsInjury"("sport", "season", "week");

-- CreateIndex
CREATE UNIQUE INDEX "SportsInjury_sport_externalId_source_key" ON "SportsInjury"("sport", "externalId", "source");

-- CreateIndex
CREATE INDEX "SportsNews_sport_publishedAt_idx" ON "SportsNews"("sport", "publishedAt");

-- CreateIndex
CREATE INDEX "SportsNews_playerName_idx" ON "SportsNews"("playerName");

-- CreateIndex
CREATE INDEX "SportsNews_team_idx" ON "SportsNews"("team");

-- CreateIndex
CREATE INDEX "SportsNews_category_idx" ON "SportsNews"("category");

-- CreateIndex
CREATE INDEX "SportsNews_sentiment_idx" ON "SportsNews"("sentiment");

-- CreateIndex
CREATE UNIQUE INDEX "SportsNews_sport_externalId_source_key" ON "SportsNews"("sport", "externalId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyUser_sleeperUsername_key" ON "LegacyUser"("sleeperUsername");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyUser_sleeperUserId_key" ON "LegacyUser"("sleeperUserId");

-- CreateIndex
CREATE INDEX "LegacyUser_sleeperUsername_idx" ON "LegacyUser"("sleeperUsername");

-- CreateIndex
CREATE INDEX "UserEvent_userId_idx" ON "UserEvent"("userId");

-- CreateIndex
CREATE INDEX "UserEvent_eventType_idx" ON "UserEvent"("eventType");

-- CreateIndex
CREATE INDEX "UserEvent_createdAt_idx" ON "UserEvent"("createdAt");

-- CreateIndex
CREATE INDEX "UserEvent_userId_eventType_idx" ON "UserEvent"("userId", "eventType");

-- CreateIndex
CREATE INDEX "legacy_user_rank_cache_last_calculated_idx" ON "legacy_user_rank_cache"("last_calculated_at");

-- CreateIndex
CREATE INDEX "legacy_user_rank_cache_last_refresh_idx" ON "legacy_user_rank_cache"("last_refresh_at");

-- CreateIndex
CREATE INDEX "LegacyImportJob_userId_status_idx" ON "LegacyImportJob"("userId", "status");

-- CreateIndex
CREATE INDEX "LegacyLeague_userId_season_idx" ON "LegacyLeague"("userId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyLeague_userId_sleeperLeagueId_key" ON "LegacyLeague"("userId", "sleeperLeagueId");

-- CreateIndex
CREATE INDEX "LegacyRoster_leagueId_idx" ON "LegacyRoster"("leagueId");

-- CreateIndex
CREATE INDEX "LegacyRoster_ownerId_idx" ON "LegacyRoster"("ownerId");

-- CreateIndex
CREATE INDEX "LegacyRoster_leagueId_ownerId_idx" ON "LegacyRoster"("leagueId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyRoster_leagueId_rosterId_key" ON "LegacyRoster"("leagueId", "rosterId");

-- CreateIndex
CREATE UNIQUE INDEX "LegacySeasonSummary_leagueId_key" ON "LegacySeasonSummary"("leagueId");

-- CreateIndex
CREATE INDEX "LegacyAIReport_userId_reportType_idx" ON "LegacyAIReport"("userId", "reportType");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_emailHash_idx" ON "AnalyticsEvent"("emailHash");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_toolKey_idx" ON "AnalyticsEvent"("toolKey");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_event_createdAt_idx" ON "AnalyticsEvent"("event", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_path_createdAt_idx" ON "AnalyticsEvent"("path", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TradeNotification_transactionId_key" ON "TradeNotification"("transactionId");

-- CreateIndex
CREATE INDEX "TradeNotification_userId_status_idx" ON "TradeNotification"("userId", "status");

-- CreateIndex
CREATE INDEX "TradeNotification_userId_seenAt_idx" ON "TradeNotification"("userId", "seenAt");

-- CreateIndex
CREATE INDEX "TradeNotification_leagueId_idx" ON "TradeNotification"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailPreference_email_key" ON "EmailPreference"("email");

-- CreateIndex
CREATE INDEX "EmailPreference_legacyUserId_idx" ON "EmailPreference"("legacyUserId");

-- CreateIndex
CREATE INDEX "EmailPreference_sleeperUsername_idx" ON "EmailPreference"("sleeperUsername");

-- CreateIndex
CREATE UNIQUE INDEX "AIUserProfile_userId_key" ON "AIUserProfile"("userId");

-- CreateIndex
CREATE INDEX "AIUserProfile_sleeperUsername_idx" ON "AIUserProfile"("sleeperUsername");

-- CreateIndex
CREATE INDEX "trade_suggestion_votes_userId_idx" ON "trade_suggestion_votes"("userId");

-- CreateIndex
CREATE INDEX "trade_suggestion_votes_userId_createdAt_idx" ON "trade_suggestion_votes"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "trade_suggestion_votes_vote_idx" ON "trade_suggestion_votes"("vote");

-- CreateIndex
CREATE INDEX "trade_feedback_userId_createdAt_idx" ON "trade_feedback"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "trade_feedback_vote_idx" ON "trade_feedback"("vote");

-- CreateIndex
CREATE INDEX "trade_feedback_reason_idx" ON "trade_feedback"("reason");

-- CreateIndex
CREATE UNIQUE INDEX "trade_profiles_userId_key" ON "trade_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AILeagueContext_leagueId_key" ON "AILeagueContext"("leagueId");

-- CreateIndex
CREATE INDEX "AILeagueContext_sport_idx" ON "AILeagueContext"("sport");

-- CreateIndex
CREATE INDEX "AILeagueContext_phase_idx" ON "AILeagueContext"("phase");

-- CreateIndex
CREATE INDEX "AITeamStateSnapshot_leagueId_teamId_idx" ON "AITeamStateSnapshot"("leagueId", "teamId");

-- CreateIndex
CREATE INDEX "AITeamStateSnapshot_sleeperUsername_idx" ON "AITeamStateSnapshot"("sleeperUsername");

-- CreateIndex
CREATE INDEX "AITeamStateSnapshot_computedAt_idx" ON "AITeamStateSnapshot"("computedAt");

-- CreateIndex
CREATE INDEX "ai_memories_userId_idx" ON "ai_memories"("userId");

-- CreateIndex
CREATE INDEX "ai_memories_leagueId_idx" ON "ai_memories"("leagueId");

-- CreateIndex
CREATE INDEX "ai_memories_scope_idx" ON "ai_memories"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "ai_memories_userId_leagueId_scope_key_key" ON "ai_memories"("userId", "leagueId", "scope", "key");

-- CreateIndex
CREATE INDEX "AIMemoryEvent_userId_idx" ON "AIMemoryEvent"("userId");

-- CreateIndex
CREATE INDEX "AIMemoryEvent_leagueId_idx" ON "AIMemoryEvent"("leagueId");

-- CreateIndex
CREATE INDEX "AIMemoryEvent_eventType_idx" ON "AIMemoryEvent"("eventType");

-- CreateIndex
CREATE INDEX "AIMemoryEvent_expiresAt_idx" ON "AIMemoryEvent"("expiresAt");

-- CreateIndex
CREATE INDEX "AIUserFeedback_userId_idx" ON "AIUserFeedback"("userId");

-- CreateIndex
CREATE INDEX "AIUserFeedback_leagueId_idx" ON "AIUserFeedback"("leagueId");

-- CreateIndex
CREATE INDEX "AIUserFeedback_actionType_idx" ON "AIUserFeedback"("actionType");

-- CreateIndex
CREATE INDEX "TradeFeedback_sleeperUsername_idx" ON "TradeFeedback"("sleeperUsername");

-- CreateIndex
CREATE INDEX "TradeFeedback_leagueId_idx" ON "TradeFeedback"("leagueId");

-- CreateIndex
CREATE INDEX "TradeFeedback_rating_idx" ON "TradeFeedback"("rating");

-- CreateIndex
CREATE INDEX "TradeFeedback_createdAt_idx" ON "TradeFeedback"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TradePreferences_sleeperUsername_key" ON "TradePreferences"("sleeperUsername");

-- CreateIndex
CREATE INDEX "TradePreferences_sleeperUsername_idx" ON "TradePreferences"("sleeperUsername");

-- CreateIndex
CREATE INDEX "LeagueTradeHistory_sleeperUsername_idx" ON "LeagueTradeHistory"("sleeperUsername");

-- CreateIndex
CREATE INDEX "LeagueTradeHistory_status_idx" ON "LeagueTradeHistory"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueTradeHistory_sleeperLeagueId_sleeperUsername_key" ON "LeagueTradeHistory"("sleeperLeagueId", "sleeperUsername");

-- CreateIndex
CREATE INDEX "LeagueTrade_historyId_idx" ON "LeagueTrade"("historyId");

-- CreateIndex
CREATE INDEX "LeagueTrade_analyzed_idx" ON "LeagueTrade"("analyzed");

-- CreateIndex
CREATE INDEX "LeagueTrade_season_idx" ON "LeagueTrade"("season");

-- CreateIndex
CREATE INDEX "LeagueTrade_platform_idx" ON "LeagueTrade"("platform");

-- CreateIndex
CREATE INDEX "LeagueTrade_sport_idx" ON "LeagueTrade"("sport");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueTrade_historyId_transactionId_key" ON "LeagueTrade"("historyId", "transactionId");

-- CreateIndex
CREATE INDEX "TradeLearningInsight_insightType_idx" ON "TradeLearningInsight"("insightType");

-- CreateIndex
CREATE INDEX "TradeLearningInsight_position_idx" ON "TradeLearningInsight"("position");

-- CreateIndex
CREATE INDEX "TradeLearningInsight_season_idx" ON "TradeLearningInsight"("season");

-- CreateIndex
CREATE UNIQUE INDEX "TradeLearningInsight_insightType_playerName_position_ageRan_key" ON "TradeLearningInsight"("insightType", "playerName", "position", "ageRange", "season");

-- CreateIndex
CREATE UNIQUE INDEX "TradeLearningStats_season_key" ON "TradeLearningStats"("season");

-- CreateIndex
CREATE INDEX "TradePreAnalysisCache_sleeperUsername_idx" ON "TradePreAnalysisCache"("sleeperUsername");

-- CreateIndex
CREATE INDEX "TradePreAnalysisCache_status_idx" ON "TradePreAnalysisCache"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TradePreAnalysisCache_sleeperUsername_sleeperLeagueId_key" ON "TradePreAnalysisCache"("sleeperUsername", "sleeperLeagueId");

-- CreateIndex
CREATE INDEX "LeagueTypeSubmission_email_idx" ON "LeagueTypeSubmission"("email");

-- CreateIndex
CREATE INDEX "LeagueTypeSubmission_status_idx" ON "LeagueTypeSubmission"("status");

-- CreateIndex
CREATE INDEX "LeagueTypeSubmission_createdAt_idx" ON "LeagueTypeSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "LegacyFeedback_status_idx" ON "LegacyFeedback"("status");

-- CreateIndex
CREATE INDEX "LegacyFeedback_feedbackType_idx" ON "LegacyFeedback"("feedbackType");

-- CreateIndex
CREATE INDEX "LegacyFeedback_tool_idx" ON "LegacyFeedback"("tool");

-- CreateIndex
CREATE INDEX "LegacyFeedback_priority_idx" ON "LegacyFeedback"("priority");

-- CreateIndex
CREATE INDEX "LegacyFeedback_aiSeverity_idx" ON "LegacyFeedback"("aiSeverity");

-- CreateIndex
CREATE INDEX "LegacyFeedback_createdAt_idx" ON "LegacyFeedback"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "YahooConnection_yahooUserId_key" ON "YahooConnection"("yahooUserId");

-- CreateIndex
CREATE INDEX "YahooConnection_yahooUserId_idx" ON "YahooConnection"("yahooUserId");

-- CreateIndex
CREATE UNIQUE INDEX "YahooLeague_yahooLeagueKey_key" ON "YahooLeague"("yahooLeagueKey");

-- CreateIndex
CREATE INDEX "YahooLeague_connectionId_idx" ON "YahooLeague"("connectionId");

-- CreateIndex
CREATE INDEX "YahooLeague_sport_idx" ON "YahooLeague"("sport");

-- CreateIndex
CREATE INDEX "YahooLeague_season_idx" ON "YahooLeague"("season");

-- CreateIndex
CREATE UNIQUE INDEX "YahooTeam_yahooTeamKey_key" ON "YahooTeam"("yahooTeamKey");

-- CreateIndex
CREATE INDEX "YahooTeam_leagueId_idx" ON "YahooTeam"("leagueId");

-- CreateIndex
CREATE INDEX "YahooTeam_isUserTeam_idx" ON "YahooTeam"("isUserTeam");

-- CreateIndex
CREATE UNIQUE INDEX "MFLConnection_sessionId_key" ON "MFLConnection"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "MFLConnection_mflUsername_key" ON "MFLConnection"("mflUsername");

-- CreateIndex
CREATE INDEX "MFLConnection_mflUsername_idx" ON "MFLConnection"("mflUsername");

-- CreateIndex
CREATE INDEX "InsightEvent_eventType_idx" ON "InsightEvent"("eventType");

-- CreateIndex
CREATE INDEX "InsightEvent_insightId_idx" ON "InsightEvent"("insightId");

-- CreateIndex
CREATE INDEX "InsightEvent_confidenceLevel_idx" ON "InsightEvent"("confidenceLevel");

-- CreateIndex
CREATE INDEX "InsightEvent_createdAt_idx" ON "InsightEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AIIssue_status_idx" ON "AIIssue"("status");

-- CreateIndex
CREATE INDEX "AIIssue_priority_idx" ON "AIIssue"("priority");

-- CreateIndex
CREATE INDEX "AIIssue_area_idx" ON "AIIssue"("area");

-- CreateIndex
CREATE INDEX "AIIssue_createdAt_idx" ON "AIIssue"("createdAt");

-- CreateIndex
CREATE INDEX "AIIssueFeedback_issueId_idx" ON "AIIssueFeedback"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "FantraxUser_fantraxUsername_key" ON "FantraxUser"("fantraxUsername");

-- CreateIndex
CREATE INDEX "FantraxUser_fantraxUsername_idx" ON "FantraxUser"("fantraxUsername");

-- CreateIndex
CREATE INDEX "FantraxLeague_userId_season_idx" ON "FantraxLeague"("userId", "season");

-- CreateIndex
CREATE INDEX "FantraxLeague_season_idx" ON "FantraxLeague"("season");

-- CreateIndex
CREATE UNIQUE INDEX "FantraxLeague_userId_leagueName_season_key" ON "FantraxLeague"("userId", "leagueName", "season");

-- CreateIndex
CREATE INDEX "SleeperImportCache_sleeperUsername_idx" ON "SleeperImportCache"("sleeperUsername");

-- CreateIndex
CREATE INDEX "SleeperImportCache_sleeperLeagueId_idx" ON "SleeperImportCache"("sleeperLeagueId");

-- CreateIndex
CREATE UNIQUE INDEX "SleeperImportCache_sleeperUsername_sleeperLeagueId_key" ON "SleeperImportCache"("sleeperUsername", "sleeperLeagueId");

-- CreateIndex
CREATE INDEX "idx_trade_block_league_active" ON "trade_block_entries"("sleeperLeagueId", "isActive", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "idx_trade_block_roster" ON "trade_block_entries"("sleeperLeagueId", "rosterId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_trade_block_active" ON "trade_block_entries"("sleeperLeagueId", "playerId");

-- CreateIndex
CREATE INDEX "trade_analysis_snapshots_leagueId_sleeperUsername_snapshotT_idx" ON "trade_analysis_snapshots"("leagueId", "sleeperUsername", "snapshotType");

-- CreateIndex
CREATE INDEX "trade_analysis_snapshots_sleeperUsername_createdAt_idx" ON "trade_analysis_snapshots"("sleeperUsername", "createdAt");

-- CreateIndex
CREATE INDEX "trade_analysis_snapshots_expiresAt_idx" ON "trade_analysis_snapshots"("expiresAt");

-- CreateIndex
CREATE INDEX "share_rewards_sleeperUsername_idx" ON "share_rewards"("sleeperUsername");

-- CreateIndex
CREATE INDEX "share_rewards_createdAt_idx" ON "share_rewards"("createdAt");

-- CreateIndex
CREATE INDEX "share_rewards_redeemed_idx" ON "share_rewards"("redeemed");

-- CreateIndex
CREATE INDEX "decision_logs_userId_idx" ON "decision_logs"("userId");

-- CreateIndex
CREATE INDEX "decision_logs_leagueId_idx" ON "decision_logs"("leagueId");

-- CreateIndex
CREATE INDEX "decision_logs_userId_leagueId_idx" ON "decision_logs"("userId", "leagueId");

-- CreateIndex
CREATE INDEX "decision_logs_decisionType_idx" ON "decision_logs"("decisionType");

-- CreateIndex
CREATE INDEX "decision_logs_userFollowed_idx" ON "decision_logs"("userFollowed");

-- CreateIndex
CREATE INDEX "decision_logs_createdAt_idx" ON "decision_logs"("createdAt");

-- CreateIndex
CREATE INDEX "decision_logs_resolvedAt_idx" ON "decision_logs"("resolvedAt");

-- CreateIndex
CREATE INDEX "decision_logs_numericConfidence_idx" ON "decision_logs"("numericConfidence");

-- CreateIndex
CREATE UNIQUE INDEX "decision_outcomes_decisionLogId_key" ON "decision_outcomes"("decisionLogId");

-- CreateIndex
CREATE INDEX "decision_outcomes_decisionLogId_idx" ON "decision_outcomes"("decisionLogId");

-- CreateIndex
CREATE INDEX "decision_outcomes_evaluatedAt_idx" ON "decision_outcomes"("evaluatedAt");

-- CreateIndex
CREATE INDEX "decision_outcomes_outcomeGrade_idx" ON "decision_outcomes"("outcomeGrade");

-- CreateIndex
CREATE INDEX "decision_outcomes_actualResult_idx" ON "decision_outcomes"("actualResult");

-- CreateIndex
CREATE UNIQUE INDEX "TradeOfferEvent_inputHash_key" ON "TradeOfferEvent"("inputHash");

-- CreateIndex
CREATE INDEX "TradeOfferEvent_leagueId_createdAt_idx" ON "TradeOfferEvent"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX "TradeOfferEvent_senderUserId_createdAt_idx" ON "TradeOfferEvent"("senderUserId", "createdAt");

-- CreateIndex
CREATE INDEX "TradeOfferEvent_opponentUserId_createdAt_idx" ON "TradeOfferEvent"("opponentUserId", "createdAt");

-- CreateIndex
CREATE INDEX "TradeOfferEvent_mode_createdAt_idx" ON "TradeOfferEvent"("mode", "createdAt");

-- CreateIndex
CREATE INDEX "TradeOfferEvent_leagueTradeId_idx" ON "TradeOfferEvent"("leagueTradeId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeOutcomeEvent_offerEventId_key" ON "TradeOutcomeEvent"("offerEventId");

-- CreateIndex
CREATE INDEX "TradeOutcomeEvent_leagueId_createdAt_idx" ON "TradeOutcomeEvent"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX "TradeOutcomeEvent_outcome_createdAt_idx" ON "TradeOutcomeEvent"("outcome", "createdAt");

-- CreateIndex
CREATE INDEX "TradeOutcomeEvent_leagueTradeId_idx" ON "TradeOutcomeEvent"("leagueTradeId");

-- CreateIndex
CREATE INDEX "ModelMetricsDaily_day_idx" ON "ModelMetricsDaily"("day");

-- CreateIndex
CREATE UNIQUE INDEX "ModelMetricsDaily_day_mode_segmentKey_key" ON "ModelMetricsDaily"("day", "mode", "segmentKey");

-- CreateIndex
CREATE INDEX "LearnedWeights_leagueClass_idx" ON "LearnedWeights"("leagueClass");

-- CreateIndex
CREATE UNIQUE INDEX "LearnedWeights_leagueClass_season_key" ON "LearnedWeights"("leagueClass", "season");

-- CreateIndex
CREATE INDEX "RankingWeightsWeekly_segmentKey_status_idx" ON "RankingWeightsWeekly"("segmentKey", "status");

-- CreateIndex
CREATE INDEX "RankingWeightsWeekly_weekStart_idx" ON "RankingWeightsWeekly"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "RankingWeightsWeekly_segmentKey_weekStart_key" ON "RankingWeightsWeekly"("segmentKey", "weekStart");

-- CreateIndex
CREATE INDEX "LeagueDemandWeekly_leagueId_idx" ON "LeagueDemandWeekly"("leagueId");

-- CreateIndex
CREATE INDEX "LeagueDemandWeekly_weekStart_idx" ON "LeagueDemandWeekly"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueDemandWeekly_leagueId_weekStart_rangeDays_key" ON "LeagueDemandWeekly"("leagueId", "weekStart", "rangeDays");

-- CreateIndex
CREATE INDEX "NarrativeValidationLog_mode_idx" ON "NarrativeValidationLog"("mode");

-- CreateIndex
CREATE INDEX "NarrativeValidationLog_contractType_idx" ON "NarrativeValidationLog"("contractType");

-- CreateIndex
CREATE INDEX "NarrativeValidationLog_valid_idx" ON "NarrativeValidationLog"("valid");

-- CreateIndex
CREATE INDEX "NarrativeValidationLog_createdAt_idx" ON "NarrativeValidationLog"("createdAt");

-- CreateIndex
CREATE INDEX "manager_dna_sleeperUserId_idx" ON "manager_dna"("sleeperUserId");

-- CreateIndex
CREATE INDEX "manager_dna_lastComputedAt_idx" ON "manager_dna"("lastComputedAt");

-- CreateIndex
CREATE UNIQUE INDEX "manager_dna_sleeperUsername_key" ON "manager_dna"("sleeperUsername");

-- CreateIndex
CREATE INDEX "opponent_tendencies_leagueId_idx" ON "opponent_tendencies"("leagueId");

-- CreateIndex
CREATE INDEX "opponent_tendencies_lastComputedAt_idx" ON "opponent_tendencies"("lastComputedAt");

-- CreateIndex
CREATE UNIQUE INDEX "opponent_tendencies_leagueId_rosterId_key" ON "opponent_tendencies"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX "strategy_snapshots_leagueId_idx" ON "strategy_snapshots"("leagueId");

-- CreateIndex
CREATE INDEX "strategy_snapshots_sleeperUsername_idx" ON "strategy_snapshots"("sleeperUsername");

-- CreateIndex
CREATE INDEX "strategy_snapshots_lastComputedAt_idx" ON "strategy_snapshots"("lastComputedAt");

-- CreateIndex
CREATE INDEX "strategy_snapshots_expiresAt_idx" ON "strategy_snapshots"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "strategy_snapshots_leagueId_rosterId_season_key" ON "strategy_snapshots"("leagueId", "rosterId", "season");

-- CreateIndex
CREATE INDEX "player_season_stats_sport_playerId_idx" ON "player_season_stats"("sport", "playerId");

-- CreateIndex
CREATE INDEX "player_season_stats_sport_playerId_source_seasonType_idx" ON "player_season_stats"("sport", "playerId", "source", "seasonType");

-- CreateIndex
CREATE INDEX "player_season_stats_sport_playerName_idx" ON "player_season_stats"("sport", "playerName");

-- CreateIndex
CREATE INDEX "player_season_stats_sport_position_idx" ON "player_season_stats"("sport", "position");

-- CreateIndex
CREATE INDEX "player_season_stats_season_idx" ON "player_season_stats"("season");

-- CreateIndex
CREATE INDEX "player_season_stats_source_idx" ON "player_season_stats"("source");

-- CreateIndex
CREATE UNIQUE INDEX "player_season_stats_sport_playerId_season_seasonType_source_key" ON "player_season_stats"("sport", "playerId", "season", "seasonType", "source");

-- CreateIndex
CREATE INDEX "trending_players_sport_crowdSignal_idx" ON "trending_players"("sport", "crowdSignal");

-- CreateIndex
CREATE INDEX "trending_players_sport_crowdScore_idx" ON "trending_players"("sport", "crowdScore");

-- CreateIndex
CREATE INDEX "trending_players_playerName_idx" ON "trending_players"("playerName");

-- CreateIndex
CREATE UNIQUE INDEX "trending_players_sport_sleeperId_lookbackHours_key" ON "trending_players"("sport", "sleeperId", "lookbackHours");

-- CreateIndex
CREATE INDEX "depth_charts_sport_team_idx" ON "depth_charts"("sport", "team");

-- CreateIndex
CREATE INDEX "depth_charts_sport_position_idx" ON "depth_charts"("sport", "position");

-- CreateIndex
CREATE UNIQUE INDEX "depth_charts_sport_team_position_source_key" ON "depth_charts"("sport", "team", "position", "source");

-- CreateIndex
CREATE INDEX "team_season_stats_sport_team_idx" ON "team_season_stats"("sport", "team");

-- CreateIndex
CREATE INDEX "team_season_stats_season_idx" ON "team_season_stats"("season");

-- CreateIndex
CREATE UNIQUE INDEX "team_season_stats_sport_team_season_seasonType_source_key" ON "team_season_stats"("sport", "team", "season", "seasonType", "source");

-- CreateIndex
CREATE INDEX "ProviderSyncState_provider_entityType_sport_key_idx" ON "ProviderSyncState"("provider", "entityType", "sport", "key");

-- CreateIndex
CREATE INDEX "ProviderSyncState_lastSuccessAt_idx" ON "ProviderSyncState"("lastSuccessAt");

-- CreateIndex
CREATE INDEX "ProviderSyncState_lastErrorAt_idx" ON "ProviderSyncState"("lastErrorAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSyncState_provider_entityType_sport_key_key" ON "ProviderSyncState"("provider", "entityType", "sport", "key");

-- CreateIndex
CREATE INDEX "AiOutput_provider_role_taskType_idx" ON "AiOutput"("provider", "role", "taskType");

-- CreateIndex
CREATE INDEX "AiOutput_targetType_targetId_idx" ON "AiOutput"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AiOutput_createdAt_idx" ON "AiOutput"("createdAt");

-- CreateIndex
CREATE INDEX "guardian_interventions_userId_idx" ON "guardian_interventions"("userId");

-- CreateIndex
CREATE INDEX "guardian_interventions_leagueId_idx" ON "guardian_interventions"("leagueId");

-- CreateIndex
CREATE INDEX "guardian_interventions_actionType_idx" ON "guardian_interventions"("actionType");

-- CreateIndex
CREATE INDEX "guardian_interventions_severity_idx" ON "guardian_interventions"("severity");

-- CreateIndex
CREATE INDEX "guardian_interventions_userDecision_idx" ON "guardian_interventions"("userDecision");

-- CreateIndex
CREATE INDEX "guardian_interventions_createdAt_idx" ON "guardian_interventions"("createdAt");

-- CreateIndex
CREATE INDEX "ai_insights_userId_idx" ON "ai_insights"("userId");

-- CreateIndex
CREATE INDEX "ai_insights_sleeperUsername_idx" ON "ai_insights"("sleeperUsername");

-- CreateIndex
CREATE INDEX "ai_insights_insightType_idx" ON "ai_insights"("insightType");

-- CreateIndex
CREATE INDEX "ai_insights_category_idx" ON "ai_insights"("category");

-- CreateIndex
CREATE INDEX "ai_insights_isRead_idx" ON "ai_insights"("isRead");

-- CreateIndex
CREATE INDEX "ai_insights_createdAt_idx" ON "ai_insights"("createdAt");

-- CreateIndex
CREATE INDEX "ai_badges_userId_idx" ON "ai_badges"("userId");

-- CreateIndex
CREATE INDEX "ai_badges_sleeperUsername_idx" ON "ai_badges"("sleeperUsername");

-- CreateIndex
CREATE INDEX "ai_badges_badgeType_idx" ON "ai_badges"("badgeType");

-- CreateIndex
CREATE INDEX "ai_badges_earnedAt_idx" ON "ai_badges"("earnedAt");

-- CreateIndex
CREATE INDEX "simulation_runs_userId_idx" ON "simulation_runs"("userId");

-- CreateIndex
CREATE INDEX "simulation_runs_sleeperUsername_idx" ON "simulation_runs"("sleeperUsername");

-- CreateIndex
CREATE INDEX "simulation_runs_leagueId_idx" ON "simulation_runs"("leagueId");

-- CreateIndex
CREATE INDEX "simulation_runs_simulationType_idx" ON "simulation_runs"("simulationType");

-- CreateIndex
CREATE INDEX "simulation_runs_createdAt_idx" ON "simulation_runs"("createdAt");

-- CreateIndex
CREATE INDEX "chat_conversations_userId_idx" ON "chat_conversations"("userId");

-- CreateIndex
CREATE INDEX "chat_conversations_sleeperUsername_idx" ON "chat_conversations"("sleeperUsername");

-- CreateIndex
CREATE INDEX "chat_conversations_lastMessageAt_idx" ON "chat_conversations"("lastMessageAt");

-- CreateIndex
CREATE INDEX "WeeklyMatchup_leagueId_seasonYear_week_idx" ON "WeeklyMatchup"("leagueId", "seasonYear", "week");

-- CreateIndex
CREATE INDEX "WeeklyMatchup_leagueId_seasonYear_rosterId_idx" ON "WeeklyMatchup"("leagueId", "seasonYear", "rosterId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyMatchup_leagueId_seasonYear_week_rosterId_key" ON "WeeklyMatchup"("leagueId", "seasonYear", "week", "rosterId");

-- CreateIndex
CREATE INDEX "rankings_snapshots_leagueId_season_week_idx" ON "rankings_snapshots"("leagueId", "season", "week");

-- CreateIndex
CREATE INDEX "rankings_snapshots_leagueId_rosterId_createdAt_idx" ON "rankings_snapshots"("leagueId", "rosterId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "rankings_snapshots_leagueId_season_week_rosterId_key" ON "rankings_snapshots"("leagueId", "season", "week", "rosterId");

-- CreateIndex
CREATE INDEX "rankings_weights_snapshot_leagueId_season_week_idx" ON "rankings_weights_snapshot"("leagueId", "season", "week");

-- CreateIndex
CREATE INDEX "season_results_leagueId_season_idx" ON "season_results"("leagueId", "season");

-- CreateIndex
CREATE INDEX "season_results_leagueId_rosterId_idx" ON "season_results"("leagueId", "rosterId");

-- CreateIndex
CREATE UNIQUE INDEX "season_results_leagueId_season_rosterId_key" ON "season_results"("leagueId", "season", "rosterId");

-- CreateIndex
CREATE INDEX "draft_grades_leagueId_season_idx" ON "draft_grades"("leagueId", "season");

-- CreateIndex
CREATE INDEX "draft_grades_leagueId_rosterId_season_idx" ON "draft_grades"("leagueId", "rosterId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "draft_grades_leagueId_season_rosterId_key" ON "draft_grades"("leagueId", "season", "rosterId");

-- CreateIndex
CREATE INDEX "hall_of_fame_leagueId_score_idx" ON "hall_of_fame"("leagueId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "hall_of_fame_leagueId_rosterId_key" ON "hall_of_fame"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX "hall_of_fame_entries_sport_category_idx" ON "hall_of_fame_entries"("sport", "category");

-- CreateIndex
CREATE INDEX "hall_of_fame_entries_leagueId_entityType_idx" ON "hall_of_fame_entries"("leagueId", "entityType");

-- CreateIndex
CREATE INDEX "hall_of_fame_entries_entityType_entityId_idx" ON "hall_of_fame_entries"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "hall_of_fame_entries_inductedAt_idx" ON "hall_of_fame_entries"("inductedAt");

-- CreateIndex
CREATE INDEX "hall_of_fame_moments_leagueId_season_idx" ON "hall_of_fame_moments"("leagueId", "season");

-- CreateIndex
CREATE INDEX "hall_of_fame_moments_sport_season_idx" ON "hall_of_fame_moments"("sport", "season");

-- CreateIndex
CREATE INDEX "hall_of_fame_moments_createdAt_idx" ON "hall_of_fame_moments"("createdAt");

-- CreateIndex
CREATE INDEX "legacy_score_records_sport_leagueId_idx" ON "legacy_score_records"("sport", "leagueId");

-- CreateIndex
CREATE INDEX "legacy_score_records_entityType_entityId_idx" ON "legacy_score_records"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "legacy_score_records_overallLegacyScore_idx" ON "legacy_score_records"("overallLegacyScore");

-- CreateIndex
CREATE UNIQUE INDEX "legacy_score_records_entityType_entityId_sport_leagueId_key" ON "legacy_score_records"("entityType", "entityId", "sport", "leagueId");

-- CreateIndex
CREATE INDEX "legacy_evidence_records_entityType_entityId_sport_idx" ON "legacy_evidence_records"("entityType", "entityId", "sport");

-- CreateIndex
CREATE INDEX "legacy_evidence_records_sport_evidenceType_idx" ON "legacy_evidence_records"("sport", "evidenceType");

-- CreateIndex
CREATE INDEX "ApiUsageEvent_ts_idx" ON "ApiUsageEvent"("ts");

-- CreateIndex
CREATE INDEX "ApiUsageEvent_scope_ts_idx" ON "ApiUsageEvent"("scope", "ts");

-- CreateIndex
CREATE INDEX "ApiUsageEvent_endpoint_ts_idx" ON "ApiUsageEvent"("endpoint", "ts");

-- CreateIndex
CREATE INDEX "ApiUsageEvent_tool_ts_idx" ON "ApiUsageEvent"("tool", "ts");

-- CreateIndex
CREATE INDEX "ApiUsageEvent_leagueId_ts_idx" ON "ApiUsageEvent"("leagueId", "ts");

-- CreateIndex
CREATE INDEX "ApiUsageEvent_userId_ts_idx" ON "ApiUsageEvent"("userId", "ts");

-- CreateIndex
CREATE INDEX "ApiUsageRollup_bucketType_bucketStart_idx" ON "ApiUsageRollup"("bucketType", "bucketStart");

-- CreateIndex
CREATE INDEX "ApiUsageRollup_scope_bucketType_bucketStart_idx" ON "ApiUsageRollup"("scope", "bucketType", "bucketStart");

-- CreateIndex
CREATE INDEX "ApiUsageRollup_endpoint_bucketType_bucketStart_idx" ON "ApiUsageRollup"("endpoint", "bucketType", "bucketStart");

-- CreateIndex
CREATE INDEX "ApiUsageRollup_tool_bucketType_bucketStart_idx" ON "ApiUsageRollup"("tool", "bucketType", "bucketStart");

-- CreateIndex
CREATE INDEX "ApiUsageRollup_leagueId_bucketType_bucketStart_idx" ON "ApiUsageRollup"("leagueId", "bucketType", "bucketStart");

-- CreateIndex
CREATE UNIQUE INDEX "ApiUsageRollup_bucketType_bucketStart_scope_tool_endpoint_l_key" ON "ApiUsageRollup"("bucketType", "bucketStart", "scope", "tool", "endpoint", "leagueId");

-- CreateIndex
CREATE INDEX "Player_league_idx" ON "Player"("league");

-- CreateIndex
CREATE INDEX "Player_devyEligible_idx" ON "Player"("devyEligible");

-- CreateIndex
CREATE INDEX "DevyPlayer_devyEligible_idx" ON "DevyPlayer"("devyEligible");

-- CreateIndex
CREATE INDEX "DevyPlayer_league_idx" ON "DevyPlayer"("league");

-- CreateIndex
CREATE INDEX "DevyPlayer_position_idx" ON "DevyPlayer"("position");

-- CreateIndex
CREATE INDEX "DevyPlayer_draftEligibleYear_idx" ON "DevyPlayer"("draftEligibleYear");

-- CreateIndex
CREATE INDEX "DevyPlayer_graduatedToNFL_idx" ON "DevyPlayer"("graduatedToNFL");

-- CreateIndex
CREATE INDEX "DevyPlayer_cfbdId_idx" ON "DevyPlayer"("cfbdId");

-- CreateIndex
CREATE INDEX "DevyPlayer_draftStatus_idx" ON "DevyPlayer"("draftStatus");

-- CreateIndex
CREATE INDEX "DevyPlayer_draftProjectionScore_idx" ON "DevyPlayer"("draftProjectionScore");

-- CreateIndex
CREATE UNIQUE INDEX "DevyPlayer_normalizedName_position_school_key" ON "DevyPlayer"("normalizedName", "position", "school");

-- CreateIndex
CREATE INDEX "DevyAdp_playerId_idx" ON "DevyAdp"("playerId");

-- CreateIndex
CREATE INDEX "DevyAdp_season_idx" ON "DevyAdp"("season");

-- CreateIndex
CREATE UNIQUE INDEX "DevyAdp_playerId_source_season_key" ON "DevyAdp"("playerId", "source", "season");

-- CreateIndex
CREATE INDEX "TradeOutcomeTraining_leagueId_createdAt_idx" ON "TradeOutcomeTraining"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX "TradeOutcomeTraining_wasAccepted_idx" ON "TradeOutcomeTraining"("wasAccepted");

-- CreateIndex
CREATE INDEX "TradeShare_expiresAt_idx" ON "TradeShare"("expiresAt");

-- CreateIndex
CREATE INDEX "TradeShare_userId_createdAt_idx" ON "TradeShare"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EngineSnapshot_leagueId_type_idx" ON "EngineSnapshot"("leagueId", "type");

-- CreateIndex
CREATE INDEX "EngineSnapshot_expiresAt_idx" ON "EngineSnapshot"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EngineSnapshot_leagueId_type_hash_key" ON "EngineSnapshot"("leagueId", "type", "hash");

-- CreateIndex
CREATE INDEX "PlayerAnalyticsSnapshot_normalizedName_idx" ON "PlayerAnalyticsSnapshot"("normalizedName");

-- CreateIndex
CREATE INDEX "PlayerAnalyticsSnapshot_position_idx" ON "PlayerAnalyticsSnapshot"("position");

-- CreateIndex
CREATE INDEX "PlayerAnalyticsSnapshot_season_idx" ON "PlayerAnalyticsSnapshot"("season");

-- CreateIndex
CREATE INDEX "PlayerAnalyticsSnapshot_status_idx" ON "PlayerAnalyticsSnapshot"("status");

-- CreateIndex
CREATE INDEX "PlayerAnalyticsSnapshot_currentTeam_idx" ON "PlayerAnalyticsSnapshot"("currentTeam");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAnalyticsSnapshot_normalizedName_season_source_key" ON "PlayerAnalyticsSnapshot"("normalizedName", "season", "source");

-- CreateIndex
CREATE UNIQUE INDEX "app_users_email_key" ON "app_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "app_users_username_key" ON "app_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "app_users_legacyUserId_key" ON "app_users"("legacyUserId");

-- CreateIndex
CREATE INDEX "growth_attributions_source_idx" ON "growth_attributions"("source");

-- CreateIndex
CREATE INDEX "growth_attributions_source_sourceId_idx" ON "growth_attributions"("source", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "growth_attributions_userId_key" ON "growth_attributions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "invite_links_token_key" ON "invite_links"("token");

-- CreateIndex
CREATE INDEX "invite_links_createdByUserId_idx" ON "invite_links"("createdByUserId");

-- CreateIndex
CREATE INDEX "invite_links_type_idx" ON "invite_links"("type");

-- CreateIndex
CREATE INDEX "invite_links_status_idx" ON "invite_links"("status");

-- CreateIndex
CREATE INDEX "invite_links_token_idx" ON "invite_links"("token");

-- CreateIndex
CREATE INDEX "invite_link_events_inviteLinkId_createdAt_idx" ON "invite_link_events"("inviteLinkId", "createdAt");

-- CreateIndex
CREATE INDEX "invite_link_events_eventType_idx" ON "invite_link_events"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_userId_key" ON "creator_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_handle_key" ON "creator_profiles"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_slug_key" ON "creator_profiles"("slug");

-- CreateIndex
CREATE INDEX "creator_profiles_handle_idx" ON "creator_profiles"("handle");

-- CreateIndex
CREATE INDEX "creator_profiles_slug_idx" ON "creator_profiles"("slug");

-- CreateIndex
CREATE INDEX "creator_profiles_visibility_idx" ON "creator_profiles"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "creator_leagues_inviteCode_key" ON "creator_leagues"("inviteCode");

-- CreateIndex
CREATE INDEX "creator_leagues_creatorId_idx" ON "creator_leagues"("creatorId");

-- CreateIndex
CREATE INDEX "creator_leagues_inviteCode_idx" ON "creator_leagues"("inviteCode");

-- CreateIndex
CREATE INDEX "creator_leagues_sport_idx" ON "creator_leagues"("sport");

-- CreateIndex
CREATE INDEX "creator_leagues_isPublic_idx" ON "creator_leagues"("isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "creator_leagues_creatorId_slug_key" ON "creator_leagues"("creatorId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "creator_invites_code_key" ON "creator_invites"("code");

-- CreateIndex
CREATE INDEX "creator_invites_creatorId_idx" ON "creator_invites"("creatorId");

-- CreateIndex
CREATE INDEX "creator_invites_code_idx" ON "creator_invites"("code");

-- CreateIndex
CREATE INDEX "creator_league_members_userId_idx" ON "creator_league_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "creator_league_members_creatorLeagueId_userId_key" ON "creator_league_members"("creatorLeagueId", "userId");

-- CreateIndex
CREATE INDEX "creator_analytics_events_creatorId_createdAt_idx" ON "creator_analytics_events"("creatorId", "createdAt");

-- CreateIndex
CREATE INDEX "creator_analytics_events_eventType_idx" ON "creator_analytics_events"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE INDEX "referral_codes_userId_idx" ON "referral_codes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "referral_events_referredUserId_key" ON "referral_events"("referredUserId");

-- CreateIndex
CREATE INDEX "referral_events_referrerId_idx" ON "referral_events"("referrerId");

-- CreateIndex
CREATE INDEX "referral_events_referrerId_type_idx" ON "referral_events"("referrerId", "type");

-- CreateIndex
CREATE INDEX "referral_rewards_userId_idx" ON "referral_rewards"("userId");

-- CreateIndex
CREATE INDEX "referral_rewards_userId_status_idx" ON "referral_rewards"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "auth_accounts_provider_providerAccountId_key" ON "auth_accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_sessionToken_key" ON "auth_sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "auth_verification_tokens_token_key" ON "auth_verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "auth_verification_tokens_identifier_token_key" ON "auth_verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "BracketTournament_sport_season_key" ON "BracketTournament"("sport", "season");

-- CreateIndex
CREATE UNIQUE INDEX "BracketNode_sportsGameId_key" ON "BracketNode"("sportsGameId");

-- CreateIndex
CREATE INDEX "BracketNode_tournamentId_round_region_idx" ON "BracketNode"("tournamentId", "round", "region");

-- CreateIndex
CREATE UNIQUE INDEX "BracketNode_tournamentId_slot_key" ON "BracketNode"("tournamentId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "BracketLeague_joinCode_key" ON "BracketLeague"("joinCode");

-- CreateIndex
CREATE INDEX "BracketLeague_tournamentId_idx" ON "BracketLeague"("tournamentId");

-- CreateIndex
CREATE INDEX "BracketLeague_ownerId_idx" ON "BracketLeague"("ownerId");

-- CreateIndex
CREATE INDEX "BracketLeagueMember_userId_idx" ON "BracketLeagueMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BracketLeagueMember_leagueId_userId_key" ON "BracketLeagueMember"("leagueId", "userId");

-- CreateIndex
CREATE INDEX "BracketEntry_leagueId_idx" ON "BracketEntry"("leagueId");

-- CreateIndex
CREATE INDEX "BracketEntry_userId_idx" ON "BracketEntry"("userId");

-- CreateIndex
CREATE INDEX "BracketEntrySnapshot_tournamentId_leagueId_idx" ON "BracketEntrySnapshot"("tournamentId", "leagueId");

-- CreateIndex
CREATE INDEX "BracketEntrySnapshot_entryId_createdAt_idx" ON "BracketEntrySnapshot"("entryId", "createdAt");

-- CreateIndex
CREATE INDEX "bracket_pick_popularity_tournamentId_leagueId_nodeId_idx" ON "bracket_pick_popularity"("tournamentId", "leagueId", "nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "bracket_pick_popularity_tournamentId_leagueId_nodeId_teamNa_key" ON "bracket_pick_popularity"("tournamentId", "leagueId", "nodeId", "teamName", "scope");

-- CreateIndex
CREATE INDEX "bracket_simulation_snapshot_leagueId_entryId_idx" ON "bracket_simulation_snapshot"("leagueId", "entryId");

-- CreateIndex
CREATE UNIQUE INDEX "bracket_simulation_snapshot_tournamentId_leagueId_entryId_key" ON "bracket_simulation_snapshot"("tournamentId", "leagueId", "entryId");

-- CreateIndex
CREATE INDEX "bracket_leaderboards_tournamentId_leagueId_rank_idx" ON "bracket_leaderboards"("tournamentId", "leagueId", "rank");

-- CreateIndex
CREATE INDEX "bracket_leaderboards_tournamentId_leagueId_score_entryId_idx" ON "bracket_leaderboards"("tournamentId", "leagueId", "score", "entryId");

-- CreateIndex
CREATE UNIQUE INDEX "bracket_leaderboards_tournamentId_leagueId_entryId_key" ON "bracket_leaderboards"("tournamentId", "leagueId", "entryId");

-- CreateIndex
CREATE INDEX "bracket_health_snapshots_leagueId_entryId_idx" ON "bracket_health_snapshots"("leagueId", "entryId");

-- CreateIndex
CREATE UNIQUE INDEX "bracket_health_snapshots_tournamentId_leagueId_entryId_key" ON "bracket_health_snapshots"("tournamentId", "leagueId", "entryId");

-- CreateIndex
CREATE INDEX "BracketPick_nodeId_idx" ON "BracketPick"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "BracketPick_entryId_nodeId_key" ON "BracketPick"("entryId", "nodeId");

-- CreateIndex
CREATE INDEX "bracket_league_messages_leagueId_createdAt_idx" ON "bracket_league_messages"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX "bracket_league_messages_userId_idx" ON "bracket_league_messages"("userId");

-- CreateIndex
CREATE INDEX "bracket_message_reactions_messageId_idx" ON "bracket_message_reactions"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "bracket_message_reactions_messageId_userId_emoji_key" ON "bracket_message_reactions"("messageId", "userId", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "BracketPayment_stripeSessionId_key" ON "BracketPayment"("stripeSessionId");

-- CreateIndex
CREATE INDEX "BracketPayment_userId_leagueId_tournamentId_idx" ON "BracketPayment"("userId", "leagueId", "tournamentId");

-- CreateIndex
CREATE INDEX "BracketPayment_stripeSessionId_idx" ON "BracketPayment"("stripeSessionId");

-- CreateIndex
CREATE INDEX "bracket_feed_events_tournamentId_createdAt_idx" ON "bracket_feed_events"("tournamentId", "createdAt");

-- CreateIndex
CREATE INDEX "bracket_feed_events_leagueId_createdAt_idx" ON "bracket_feed_events"("leagueId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bracket_risk_profiles_userId_key" ON "bracket_risk_profiles"("userId");

-- CreateIndex
CREATE INDEX "simulation_results_createdByUserId_idx" ON "simulation_results"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "simulation_results_bracketId_tournamentId_key" ON "simulation_results"("bracketId", "tournamentId");

-- CreateIndex
CREATE INDEX "bracket_challenges_leagueId_idx" ON "bracket_challenges"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "bracket_challenges_leagueId_challengerEntryId_challengedEnt_key" ON "bracket_challenges"("leagueId", "challengerEntryId", "challengedEntryId");

-- CreateIndex
CREATE INDEX "user_follows_followeeId_idx" ON "user_follows"("followeeId");

-- CreateIndex
CREATE UNIQUE INDEX "user_follows_followerId_followeeId_key" ON "user_follows"("followerId", "followeeId");

-- CreateIndex
CREATE INDEX "activity_events_leagueId_createdAt_idx" ON "activity_events"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_events_userId_createdAt_idx" ON "activity_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "reaction_events_leagueId_createdAt_idx" ON "reaction_events"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX "reaction_events_userId_createdAt_idx" ON "reaction_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "user_rivalries_userBId_idx" ON "user_rivalries"("userBId");

-- CreateIndex
CREATE UNIQUE INDEX "user_rivalries_userAId_userBId_key" ON "user_rivalries"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "rivalry_records_leagueId_sport_idx" ON "rivalry_records"("leagueId", "sport");

-- CreateIndex
CREATE INDEX "rivalry_records_leagueId_rivalryTier_idx" ON "rivalry_records"("leagueId", "rivalryTier");

-- CreateIndex
CREATE INDEX "rivalry_records_managerAId_managerBId_idx" ON "rivalry_records"("managerAId", "managerBId");

-- CreateIndex
CREATE UNIQUE INDEX "rivalry_records_leagueId_managerAId_managerBId_key" ON "rivalry_records"("leagueId", "managerAId", "managerBId");

-- CreateIndex
CREATE INDEX "rivalry_events_rivalryId_idx" ON "rivalry_events"("rivalryId");

-- CreateIndex
CREATE INDEX "rivalry_events_eventType_season_idx" ON "rivalry_events"("eventType", "season");

-- CreateIndex
CREATE INDEX "manager_psych_profiles_leagueId_sport_idx" ON "manager_psych_profiles"("leagueId", "sport");

-- CreateIndex
CREATE INDEX "manager_psych_profiles_managerId_idx" ON "manager_psych_profiles"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "manager_psych_profiles_leagueId_managerId_key" ON "manager_psych_profiles"("leagueId", "managerId");

-- CreateIndex
CREATE INDEX "profile_evidence_records_managerId_leagueId_idx" ON "profile_evidence_records"("managerId", "leagueId");

-- CreateIndex
CREATE INDEX "profile_evidence_records_evidenceType_sport_idx" ON "profile_evidence_records"("evidenceType", "sport");

-- CreateIndex
CREATE INDEX "drama_events_leagueId_sport_idx" ON "drama_events"("leagueId", "sport");

-- CreateIndex
CREATE INDEX "drama_events_leagueId_season_idx" ON "drama_events"("leagueId", "season");

-- CreateIndex
CREATE INDEX "drama_events_dramaType_season_idx" ON "drama_events"("dramaType", "season");

-- CreateIndex
CREATE INDEX "drama_timeline_records_leagueId_idx" ON "drama_timeline_records"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "drama_timeline_records_leagueId_sport_season_key" ON "drama_timeline_records"("leagueId", "sport", "season");

-- CreateIndex
CREATE INDEX "manager_reputation_records_leagueId_sport_idx" ON "manager_reputation_records"("leagueId", "sport");

-- CreateIndex
CREATE INDEX "manager_reputation_records_managerId_idx" ON "manager_reputation_records"("managerId");

-- CreateIndex
CREATE INDEX "manager_reputation_records_tier_idx" ON "manager_reputation_records"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "manager_reputation_records_leagueId_managerId_key" ON "manager_reputation_records"("leagueId", "managerId");

-- CreateIndex
CREATE INDEX "reputation_evidence_records_managerId_leagueId_idx" ON "reputation_evidence_records"("managerId", "leagueId");

-- CreateIndex
CREATE INDEX "reputation_evidence_records_leagueId_evidenceType_idx" ON "reputation_evidence_records"("leagueId", "evidenceType");

-- CreateIndex
CREATE INDEX "reputation_evidence_records_sport_evidenceType_idx" ON "reputation_evidence_records"("sport", "evidenceType");

-- CreateIndex
CREATE INDEX "manager_franchise_profiles_gmPrestigeScore_idx" ON "manager_franchise_profiles"("gmPrestigeScore");

-- CreateIndex
CREATE INDEX "manager_franchise_profiles_franchiseValue_idx" ON "manager_franchise_profiles"("franchiseValue");

-- CreateIndex
CREATE UNIQUE INDEX "manager_franchise_profiles_managerId_key" ON "manager_franchise_profiles"("managerId");

-- CreateIndex
CREATE INDEX "gm_progression_events_managerId_idx" ON "gm_progression_events"("managerId");

-- CreateIndex
CREATE INDEX "gm_progression_events_managerId_sport_idx" ON "gm_progression_events"("managerId", "sport");

-- CreateIndex
CREATE INDEX "gm_progression_events_eventType_createdAt_idx" ON "gm_progression_events"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "manager_xp_profiles_totalXP_idx" ON "manager_xp_profiles"("totalXP");

-- CreateIndex
CREATE INDEX "manager_xp_profiles_currentTier_idx" ON "manager_xp_profiles"("currentTier");

-- CreateIndex
CREATE UNIQUE INDEX "manager_xp_profiles_managerId_key" ON "manager_xp_profiles"("managerId");

-- CreateIndex
CREATE INDEX "xp_events_managerId_idx" ON "xp_events"("managerId");

-- CreateIndex
CREATE INDEX "xp_events_managerId_sport_idx" ON "xp_events"("managerId", "sport");

-- CreateIndex
CREATE INDEX "xp_events_eventType_createdAt_idx" ON "xp_events"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "award_records_leagueId_season_idx" ON "award_records"("leagueId", "season");

-- CreateIndex
CREATE INDEX "award_records_leagueId_season_awardType_idx" ON "award_records"("leagueId", "season", "awardType");

-- CreateIndex
CREATE INDEX "award_records_managerId_idx" ON "award_records"("managerId");

-- CreateIndex
CREATE INDEX "record_book_entries_leagueId_recordType_idx" ON "record_book_entries"("leagueId", "recordType");

-- CreateIndex
CREATE INDEX "record_book_entries_sport_recordType_idx" ON "record_book_entries"("sport", "recordType");

-- CreateIndex
CREATE INDEX "record_book_entries_holderId_idx" ON "record_book_entries"("holderId");

-- CreateIndex
CREATE UNIQUE INDEX "record_book_entries_leagueId_recordType_season_key" ON "record_book_entries"("leagueId", "recordType", "season");

-- CreateIndex
CREATE UNIQUE INDEX "manager_wallets_managerId_key" ON "manager_wallets"("managerId");

-- CreateIndex
CREATE INDEX "marketplace_items_cosmeticCategory_idx" ON "marketplace_items"("cosmeticCategory");

-- CreateIndex
CREATE INDEX "marketplace_items_sportRestriction_idx" ON "marketplace_items"("sportRestriction");

-- CreateIndex
CREATE INDEX "purchase_records_managerId_idx" ON "purchase_records"("managerId");

-- CreateIndex
CREATE INDEX "purchase_records_itemId_idx" ON "purchase_records"("itemId");

-- CreateIndex
CREATE INDEX "media_articles_leagueId_idx" ON "media_articles"("leagueId");

-- CreateIndex
CREATE INDEX "media_articles_leagueId_sport_idx" ON "media_articles"("leagueId", "sport");

-- CreateIndex
CREATE INDEX "media_articles_createdAt_idx" ON "media_articles"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "blog_articles_slug_key" ON "blog_articles"("slug");

-- CreateIndex
CREATE INDEX "blog_articles_publishStatus_idx" ON "blog_articles"("publishStatus");

-- CreateIndex
CREATE INDEX "blog_articles_sport_idx" ON "blog_articles"("sport");

-- CreateIndex
CREATE INDEX "blog_articles_category_idx" ON "blog_articles"("category");

-- CreateIndex
CREATE INDEX "blog_articles_publishedAt_idx" ON "blog_articles"("publishedAt");

-- CreateIndex
CREATE INDEX "blog_articles_createdAt_idx" ON "blog_articles"("createdAt");

-- CreateIndex
CREATE INDEX "blog_publish_logs_articleId_idx" ON "blog_publish_logs"("articleId");

-- CreateIndex
CREATE INDEX "blog_publish_logs_createdAt_idx" ON "blog_publish_logs"("createdAt");

-- CreateIndex
CREATE INDEX "broadcast_sessions_leagueId_idx" ON "broadcast_sessions"("leagueId");

-- CreateIndex
CREATE INDEX "broadcast_sessions_startedAt_idx" ON "broadcast_sessions"("startedAt");

-- CreateIndex
CREATE INDEX "commentary_entries_leagueId_idx" ON "commentary_entries"("leagueId");

-- CreateIndex
CREATE INDEX "commentary_entries_leagueId_eventType_idx" ON "commentary_entries"("leagueId", "eventType");

-- CreateIndex
CREATE INDEX "commentary_entries_createdAt_idx" ON "commentary_entries"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_phone_key" ON "user_profiles"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_sleeperUserId_key" ON "user_profiles"("sleeperUserId");

-- CreateIndex
CREATE INDEX "user_profiles_sleeperUsername_idx" ON "user_profiles"("sleeperUsername");

-- CreateIndex
CREATE INDEX "user_profiles_phone_idx" ON "user_profiles"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "email_verify_tokens_tokenHash_key" ON "email_verify_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "email_verify_tokens_userId_idx" ON "email_verify_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "leagues_legacyLeagueId_key" ON "leagues"("legacyLeagueId");

-- CreateIndex
CREATE INDEX "leagues_userId_idx" ON "leagues"("userId");

-- CreateIndex
CREATE INDEX "leagues_userId_updatedAt_idx" ON "leagues"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "leagues_userId_isDynasty_idx" ON "leagues"("userId", "isDynasty");

-- CreateIndex
CREATE INDEX "leagues_sport_season_idx" ON "leagues"("sport", "season");

-- CreateIndex
CREATE INDEX "leagues_status_idx" ON "leagues"("status");

-- CreateIndex
CREATE INDEX "leagues_importBatchId_idx" ON "leagues"("importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "leagues_userId_platform_platformLeagueId_key" ON "leagues"("userId", "platform", "platformLeagueId");

-- CreateIndex
CREATE INDEX "league_templates_userId_idx" ON "league_templates"("userId");

-- CreateIndex
CREATE INDEX "tournaments_creatorId_idx" ON "tournaments"("creatorId");

-- CreateIndex
CREATE INDEX "tournaments_sport_season_idx" ON "tournaments"("sport", "season");

-- CreateIndex
CREATE INDEX "tournaments_status_idx" ON "tournaments"("status");

-- CreateIndex
CREATE INDEX "tournament_conferences_tournamentId_idx" ON "tournament_conferences"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_leagues_leagueId_key" ON "tournament_leagues"("leagueId");

-- CreateIndex
CREATE INDEX "tournament_leagues_tournamentId_idx" ON "tournament_leagues"("tournamentId");

-- CreateIndex
CREATE INDEX "tournament_leagues_conferenceId_idx" ON "tournament_leagues"("conferenceId");

-- CreateIndex
CREATE INDEX "tournament_rounds_tournamentId_idx" ON "tournament_rounds"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_rounds_tournamentId_roundIndex_key" ON "tournament_rounds"("tournamentId", "roundIndex");

-- CreateIndex
CREATE INDEX "tournament_announcements_tournamentId_idx" ON "tournament_announcements"("tournamentId");

-- CreateIndex
CREATE INDEX "tournament_announcements_tournamentId_createdAt_idx" ON "tournament_announcements"("tournamentId", "createdAt");

-- CreateIndex
CREATE INDEX "tournament_audit_logs_tournamentId_idx" ON "tournament_audit_logs"("tournamentId");

-- CreateIndex
CREATE INDEX "tournament_audit_logs_tournamentId_createdAt_idx" ON "tournament_audit_logs"("tournamentId", "createdAt");

-- CreateIndex
CREATE INDEX "tournament_participants_tournamentId_idx" ON "tournament_participants"("tournamentId");

-- CreateIndex
CREATE INDEX "tournament_participants_conferenceId_idx" ON "tournament_participants"("conferenceId");

-- CreateIndex
CREATE INDEX "tournament_participants_tournamentId_status_idx" ON "tournament_participants"("tournamentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_participants_tournamentId_userId_key" ON "tournament_participants"("tournamentId", "userId");

-- CreateIndex
CREATE INDEX "league_chat_messages_leagueId_idx" ON "league_chat_messages"("leagueId");

-- CreateIndex
CREATE INDEX "league_chat_messages_leagueId_source_idx" ON "league_chat_messages"("leagueId", "source");

-- CreateIndex
CREATE INDEX "league_chat_messages_createdAt_idx" ON "league_chat_messages"("createdAt");

-- CreateIndex
CREATE INDEX "rosters_leagueId_idx" ON "rosters"("leagueId");

-- CreateIndex
CREATE INDEX "rosters_platformUserId_idx" ON "rosters"("platformUserId");

-- CreateIndex
CREATE UNIQUE INDEX "rosters_leagueId_platformUserId_key" ON "rosters"("leagueId", "platformUserId");

-- CreateIndex
CREATE UNIQUE INDEX "league_teams_legacyRosterId_key" ON "league_teams"("legacyRosterId");

-- CreateIndex
CREATE INDEX "league_teams_leagueId_pointsFor_idx" ON "league_teams"("leagueId", "pointsFor");

-- CreateIndex
CREATE INDEX "league_teams_divisionId_idx" ON "league_teams"("divisionId");

-- CreateIndex
CREATE INDEX "league_teams_aiPowerScore_idx" ON "league_teams"("aiPowerScore");

-- CreateIndex
CREATE UNIQUE INDEX "league_teams_leagueId_externalId_key" ON "league_teams"("leagueId", "externalId");

-- CreateIndex
CREATE INDEX "league_divisions_leagueId_idx" ON "league_divisions"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "league_divisions_leagueId_tierLevel_key" ON "league_divisions"("leagueId", "tierLevel");

-- CreateIndex
CREATE INDEX "promotion_rules_leagueId_idx" ON "promotion_rules"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_rules_leagueId_fromTierLevel_toTierLevel_key" ON "promotion_rules"("leagueId", "fromTierLevel", "toTierLevel");

-- CreateIndex
CREATE INDEX "team_performances_teamId_season_idx" ON "team_performances"("teamId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "team_performances_teamId_season_week_key" ON "team_performances"("teamId", "season", "week");

-- CreateIndex
CREATE INDEX "league_auths_userId_idx" ON "league_auths"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "league_auths_userId_platform_key" ON "league_auths"("userId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "league_waiver_settings_leagueId_key" ON "league_waiver_settings"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "guillotine_league_configs_leagueId_key" ON "guillotine_league_configs"("leagueId");

-- CreateIndex
CREATE INDEX "guillotine_roster_states_leagueId_idx" ON "guillotine_roster_states"("leagueId");

-- CreateIndex
CREATE INDEX "guillotine_roster_states_leagueId_choppedInPeriod_idx" ON "guillotine_roster_states"("leagueId", "choppedInPeriod");

-- CreateIndex
CREATE UNIQUE INDEX "guillotine_roster_states_rosterId_key" ON "guillotine_roster_states"("rosterId");

-- CreateIndex
CREATE INDEX "guillotine_period_scores_leagueId_weekOrPeriod_idx" ON "guillotine_period_scores"("leagueId", "weekOrPeriod");

-- CreateIndex
CREATE INDEX "guillotine_period_scores_leagueId_rosterId_idx" ON "guillotine_period_scores"("leagueId", "rosterId");

-- CreateIndex
CREATE UNIQUE INDEX "guillotine_period_scores_leagueId_rosterId_weekOrPeriod_key" ON "guillotine_period_scores"("leagueId", "rosterId", "weekOrPeriod");

-- CreateIndex
CREATE INDEX "guillotine_event_logs_leagueId_idx" ON "guillotine_event_logs"("leagueId");

-- CreateIndex
CREATE INDEX "guillotine_event_logs_leagueId_eventType_idx" ON "guillotine_event_logs"("leagueId", "eventType");

-- CreateIndex
CREATE INDEX "guillotine_event_logs_createdAt_idx" ON "guillotine_event_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "salary_cap_league_configs_leagueId_key" ON "salary_cap_league_configs"("leagueId");

-- CreateIndex
CREATE INDEX "salary_cap_team_ledgers_leagueId_capYear_idx" ON "salary_cap_team_ledgers"("leagueId", "capYear");

-- CreateIndex
CREATE INDEX "salary_cap_team_ledgers_rosterId_capYear_idx" ON "salary_cap_team_ledgers"("rosterId", "capYear");

-- CreateIndex
CREATE UNIQUE INDEX "salary_cap_team_ledgers_configId_rosterId_capYear_key" ON "salary_cap_team_ledgers"("configId", "rosterId", "capYear");

-- CreateIndex
CREATE INDEX "player_contracts_leagueId_rosterId_idx" ON "player_contracts"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX "player_contracts_leagueId_playerId_idx" ON "player_contracts"("leagueId", "playerId");

-- CreateIndex
CREATE INDEX "player_contracts_configId_yearSigned_idx" ON "player_contracts"("configId", "yearSigned");

-- CreateIndex
CREATE INDEX "player_contracts_rosterId_status_idx" ON "player_contracts"("rosterId", "status");

-- CreateIndex
CREATE INDEX "salary_cap_event_logs_leagueId_eventType_idx" ON "salary_cap_event_logs"("leagueId", "eventType");

-- CreateIndex
CREATE INDEX "salary_cap_event_logs_createdAt_idx" ON "salary_cap_event_logs"("createdAt");

-- CreateIndex
CREATE INDEX "salary_cap_lottery_results_leagueId_capYear_idx" ON "salary_cap_lottery_results"("leagueId", "capYear");

-- CreateIndex
CREATE UNIQUE INDEX "salary_cap_lottery_results_configId_capYear_key" ON "salary_cap_lottery_results"("configId", "capYear");

-- CreateIndex
CREATE UNIQUE INDEX "survivor_league_configs_leagueId_key" ON "survivor_league_configs"("leagueId");

-- CreateIndex
CREATE INDEX "survivor_tribes_leagueId_idx" ON "survivor_tribes"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "survivor_tribes_configId_slotIndex_key" ON "survivor_tribes"("configId", "slotIndex");

-- CreateIndex
CREATE INDEX "survivor_tribe_members_rosterId_idx" ON "survivor_tribe_members"("rosterId");

-- CreateIndex
CREATE INDEX "survivor_tribe_members_tribeId_idx" ON "survivor_tribe_members"("tribeId");

-- CreateIndex
CREATE UNIQUE INDEX "survivor_tribe_members_tribeId_rosterId_key" ON "survivor_tribe_members"("tribeId", "rosterId");

-- CreateIndex
CREATE INDEX "survivor_idols_leagueId_rosterId_idx" ON "survivor_idols"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX "survivor_idols_leagueId_playerId_idx" ON "survivor_idols"("leagueId", "playerId");

-- CreateIndex
CREATE INDEX "survivor_idols_configId_status_idx" ON "survivor_idols"("configId", "status");

-- CreateIndex
CREATE INDEX "survivor_idol_ledger_entries_leagueId_eventType_idx" ON "survivor_idol_ledger_entries"("leagueId", "eventType");

-- CreateIndex
CREATE INDEX "survivor_idol_ledger_entries_idolId_idx" ON "survivor_idol_ledger_entries"("idolId");

-- CreateIndex
CREATE INDEX "survivor_tribal_councils_leagueId_week_idx" ON "survivor_tribal_councils"("leagueId", "week");

-- CreateIndex
CREATE UNIQUE INDEX "survivor_tribal_councils_configId_week_key" ON "survivor_tribal_councils"("configId", "week");

-- CreateIndex
CREATE INDEX "survivor_votes_councilId_idx" ON "survivor_votes"("councilId");

-- CreateIndex
CREATE UNIQUE INDEX "survivor_votes_councilId_voterRosterId_key" ON "survivor_votes"("councilId", "voterRosterId");

-- CreateIndex
CREATE UNIQUE INDEX "survivor_exile_leagues_mainLeagueId_key" ON "survivor_exile_leagues"("mainLeagueId");

-- CreateIndex
CREATE UNIQUE INDEX "survivor_exile_leagues_configId_key" ON "survivor_exile_leagues"("configId");

-- CreateIndex
CREATE INDEX "survivor_exile_leagues_exileLeagueId_idx" ON "survivor_exile_leagues"("exileLeagueId");

-- CreateIndex
CREATE INDEX "survivor_exile_tokens_exileLeagueId_idx" ON "survivor_exile_tokens"("exileLeagueId");

-- CreateIndex
CREATE UNIQUE INDEX "survivor_exile_tokens_exileLeagueId_rosterId_key" ON "survivor_exile_tokens"("exileLeagueId", "rosterId");

-- CreateIndex
CREATE INDEX "survivor_jury_members_leagueId_idx" ON "survivor_jury_members"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "survivor_jury_members_leagueId_rosterId_key" ON "survivor_jury_members"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX "survivor_audit_logs_leagueId_eventType_idx" ON "survivor_audit_logs"("leagueId", "eventType");

-- CreateIndex
CREATE INDEX "survivor_audit_logs_createdAt_idx" ON "survivor_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "survivor_challenges_leagueId_week_idx" ON "survivor_challenges"("leagueId", "week");

-- CreateIndex
CREATE UNIQUE INDEX "survivor_challenges_configId_week_challengeType_key" ON "survivor_challenges"("configId", "week", "challengeType");

-- CreateIndex
CREATE INDEX "survivor_challenge_submissions_challengeId_idx" ON "survivor_challenge_submissions"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "survivor_challenge_submissions_challengeId_rosterId_key" ON "survivor_challenge_submissions"("challengeId", "rosterId");

-- CreateIndex
CREATE UNIQUE INDEX "survivor_challenge_submissions_challengeId_tribeId_key" ON "survivor_challenge_submissions"("challengeId", "tribeId");

-- CreateIndex
CREATE INDEX "survivor_tribe_chat_members_tribeId_idx" ON "survivor_tribe_chat_members"("tribeId");

-- CreateIndex
CREATE UNIQUE INDEX "survivor_tribe_chat_members_tribeId_rosterId_key" ON "survivor_tribe_chat_members"("tribeId", "rosterId");

-- CreateIndex
CREATE UNIQUE INDEX "survivor_tribe_chat_members_tribeId_userId_key" ON "survivor_tribe_chat_members"("tribeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "big_brother_league_configs_leagueId_key" ON "big_brother_league_configs"("leagueId");

-- CreateIndex
CREATE INDEX "big_brother_cycles_leagueId_week_idx" ON "big_brother_cycles"("leagueId", "week");

-- CreateIndex
CREATE UNIQUE INDEX "big_brother_cycles_configId_week_key" ON "big_brother_cycles"("configId", "week");

-- CreateIndex
CREATE INDEX "big_brother_eviction_votes_cycleId_idx" ON "big_brother_eviction_votes"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "big_brother_eviction_votes_cycleId_voterRosterId_key" ON "big_brother_eviction_votes"("cycleId", "voterRosterId");

-- CreateIndex
CREATE INDEX "big_brother_jury_members_leagueId_idx" ON "big_brother_jury_members"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "big_brother_jury_members_leagueId_rosterId_key" ON "big_brother_jury_members"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX "big_brother_finale_votes_leagueId_idx" ON "big_brother_finale_votes"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "big_brother_finale_votes_leagueId_juryRosterId_key" ON "big_brother_finale_votes"("leagueId", "juryRosterId");

-- CreateIndex
CREATE INDEX "big_brother_audit_logs_leagueId_eventType_idx" ON "big_brother_audit_logs"("leagueId", "eventType");

-- CreateIndex
CREATE INDEX "big_brother_audit_logs_createdAt_idx" ON "big_brother_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "zombie_universe_levels_universeId_idx" ON "zombie_universe_levels"("universeId");

-- CreateIndex
CREATE UNIQUE INDEX "zombie_universe_levels_universeId_rankOrder_key" ON "zombie_universe_levels"("universeId", "rankOrder");

-- CreateIndex
CREATE UNIQUE INDEX "zombie_leagues_leagueId_key" ON "zombie_leagues"("leagueId");

-- CreateIndex
CREATE INDEX "zombie_leagues_universeId_idx" ON "zombie_leagues"("universeId");

-- CreateIndex
CREATE INDEX "zombie_leagues_levelId_idx" ON "zombie_leagues"("levelId");

-- CreateIndex
CREATE UNIQUE INDEX "zombie_league_configs_leagueId_key" ON "zombie_league_configs"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "idp_league_configs_leagueId_key" ON "idp_league_configs"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "dynasty_league_configs_leagueId_key" ON "dynasty_league_configs"("leagueId");

-- CreateIndex
CREATE INDEX "dynasty_draft_order_audit_logs_leagueId_idx" ON "dynasty_draft_order_audit_logs"("leagueId");

-- CreateIndex
CREATE INDEX "dynasty_draft_order_audit_logs_configId_idx" ON "dynasty_draft_order_audit_logs"("configId");

-- CreateIndex
CREATE INDEX "idp_player_eligibility_sportsPlayerId_idx" ON "idp_player_eligibility"("sportsPlayerId");

-- CreateIndex
CREATE INDEX "idp_player_eligibility_leagueId_idx" ON "idp_player_eligibility"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "idp_player_eligibility_sportsPlayerId_leagueId_key" ON "idp_player_eligibility"("sportsPlayerId", "leagueId");

-- CreateIndex
CREATE INDEX "idp_best_ball_lineup_snapshots_leagueId_idx" ON "idp_best_ball_lineup_snapshots"("leagueId");

-- CreateIndex
CREATE INDEX "idp_best_ball_lineup_snapshots_rosterId_idx" ON "idp_best_ball_lineup_snapshots"("rosterId");

-- CreateIndex
CREATE UNIQUE INDEX "idp_best_ball_lineup_snapshots_leagueId_rosterId_periodKey_key" ON "idp_best_ball_lineup_snapshots"("leagueId", "rosterId", "periodKey");

-- CreateIndex
CREATE INDEX "idp_settings_audit_logs_leagueId_idx" ON "idp_settings_audit_logs"("leagueId");

-- CreateIndex
CREATE INDEX "idp_settings_audit_logs_configId_idx" ON "idp_settings_audit_logs"("configId");

-- CreateIndex
CREATE INDEX "idp_settings_audit_logs_createdAt_idx" ON "idp_settings_audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "devy_league_configs_leagueId_key" ON "devy_league_configs"("leagueId");

-- CreateIndex
CREATE INDEX "devy_rights_leagueId_idx" ON "devy_rights"("leagueId");

-- CreateIndex
CREATE INDEX "devy_rights_rosterId_idx" ON "devy_rights"("rosterId");

-- CreateIndex
CREATE INDEX "devy_rights_devyPlayerId_idx" ON "devy_rights"("devyPlayerId");

-- CreateIndex
CREATE INDEX "devy_rights_state_idx" ON "devy_rights"("state");

-- CreateIndex
CREATE INDEX "devy_rights_leagueId_state_idx" ON "devy_rights"("leagueId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "devy_rights_leagueId_rosterId_devyPlayerId_key" ON "devy_rights"("leagueId", "rosterId", "devyPlayerId");

-- CreateIndex
CREATE INDEX "devy_lifecycle_events_leagueId_idx" ON "devy_lifecycle_events"("leagueId");

-- CreateIndex
CREATE INDEX "devy_lifecycle_events_leagueId_eventType_idx" ON "devy_lifecycle_events"("leagueId", "eventType");

-- CreateIndex
CREATE INDEX "devy_lifecycle_events_createdAt_idx" ON "devy_lifecycle_events"("createdAt");

-- CreateIndex
CREATE INDEX "devy_commissioner_overrides_leagueId_idx" ON "devy_commissioner_overrides"("leagueId");

-- CreateIndex
CREATE INDEX "devy_commissioner_overrides_status_idx" ON "devy_commissioner_overrides"("status");

-- CreateIndex
CREATE INDEX "devy_draft_histories_leagueId_idx" ON "devy_draft_histories"("leagueId");

-- CreateIndex
CREATE INDEX "devy_draft_histories_leagueId_draftKind_idx" ON "devy_draft_histories"("leagueId", "draftKind");

-- CreateIndex
CREATE INDEX "devy_draft_histories_seasonYear_idx" ON "devy_draft_histories"("seasonYear");

-- CreateIndex
CREATE INDEX "devy_class_strength_snapshots_sport_idx" ON "devy_class_strength_snapshots"("sport");

-- CreateIndex
CREATE UNIQUE INDEX "devy_class_strength_snapshots_sport_seasonYear_key" ON "devy_class_strength_snapshots"("sport", "seasonYear");

-- CreateIndex
CREATE INDEX "devy_best_ball_lineup_snapshots_leagueId_idx" ON "devy_best_ball_lineup_snapshots"("leagueId");

-- CreateIndex
CREATE INDEX "devy_best_ball_lineup_snapshots_rosterId_idx" ON "devy_best_ball_lineup_snapshots"("rosterId");

-- CreateIndex
CREATE UNIQUE INDEX "devy_best_ball_lineup_snapshots_leagueId_rosterId_periodKey_key" ON "devy_best_ball_lineup_snapshots"("leagueId", "rosterId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "c2c_league_configs_leagueId_key" ON "c2c_league_configs"("leagueId");

-- CreateIndex
CREATE INDEX "zombie_league_teams_leagueId_idx" ON "zombie_league_teams"("leagueId");

-- CreateIndex
CREATE INDEX "zombie_league_teams_zombieLeagueId_idx" ON "zombie_league_teams"("zombieLeagueId");

-- CreateIndex
CREATE INDEX "zombie_league_teams_rosterId_idx" ON "zombie_league_teams"("rosterId");

-- CreateIndex
CREATE INDEX "zombie_league_teams_status_idx" ON "zombie_league_teams"("status");

-- CreateIndex
CREATE UNIQUE INDEX "zombie_league_teams_leagueId_rosterId_key" ON "zombie_league_teams"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX "zombie_infection_logs_leagueId_week_idx" ON "zombie_infection_logs"("leagueId", "week");

-- CreateIndex
CREATE INDEX "zombie_infection_logs_zombieLeagueId_idx" ON "zombie_infection_logs"("zombieLeagueId");

-- CreateIndex
CREATE INDEX "zombie_infection_logs_survivorRosterId_idx" ON "zombie_infection_logs"("survivorRosterId");

-- CreateIndex
CREATE INDEX "zombie_resource_ledgers_leagueId_rosterId_resourceType_idx" ON "zombie_resource_ledgers"("leagueId", "rosterId", "resourceType");

-- CreateIndex
CREATE INDEX "zombie_resource_ledgers_zombieLeagueId_idx" ON "zombie_resource_ledgers"("zombieLeagueId");

-- CreateIndex
CREATE INDEX "zombie_resource_ledger_entries_leagueId_rosterId_idx" ON "zombie_resource_ledger_entries"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX "zombie_resource_ledger_entries_leagueId_week_idx" ON "zombie_resource_ledger_entries"("leagueId", "week");

-- CreateIndex
CREATE INDEX "zombie_weekly_winnings_zombieLeagueId_idx" ON "zombie_weekly_winnings"("zombieLeagueId");

-- CreateIndex
CREATE INDEX "zombie_weekly_winnings_leagueId_week_idx" ON "zombie_weekly_winnings"("leagueId", "week");

-- CreateIndex
CREATE UNIQUE INDEX "zombie_weekly_winnings_leagueId_rosterId_week_key" ON "zombie_weekly_winnings"("leagueId", "rosterId", "week");

-- CreateIndex
CREATE INDEX "zombie_movement_projections_universeId_idx" ON "zombie_movement_projections"("universeId");

-- CreateIndex
CREATE INDEX "zombie_movement_projections_leagueId_idx" ON "zombie_movement_projections"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "zombie_movement_projections_universeId_rosterId_season_key" ON "zombie_movement_projections"("universeId", "rosterId", "season");

-- CreateIndex
CREATE INDEX "zombie_ambush_events_zombieLeagueId_week_idx" ON "zombie_ambush_events"("zombieLeagueId", "week");

-- CreateIndex
CREATE INDEX "zombie_audit_logs_leagueId_idx" ON "zombie_audit_logs"("leagueId");

-- CreateIndex
CREATE INDEX "zombie_audit_logs_universeId_idx" ON "zombie_audit_logs"("universeId");

-- CreateIndex
CREATE INDEX "zombie_audit_logs_zombieLeagueId_idx" ON "zombie_audit_logs"("zombieLeagueId");

-- CreateIndex
CREATE INDEX "zombie_audit_logs_eventType_idx" ON "zombie_audit_logs"("eventType");

-- CreateIndex
CREATE INDEX "roster_templates_sportType_idx" ON "roster_templates"("sportType");

-- CreateIndex
CREATE UNIQUE INDEX "roster_templates_sportType_formatType_key" ON "roster_templates"("sportType", "formatType");

-- CreateIndex
CREATE INDEX "roster_template_slots_templateId_idx" ON "roster_template_slots"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "league_roster_configs_leagueId_key" ON "league_roster_configs"("leagueId");

-- CreateIndex
CREATE INDEX "league_roster_configs_leagueId_idx" ON "league_roster_configs"("leagueId");

-- CreateIndex
CREATE INDEX "scoring_templates_sportType_idx" ON "scoring_templates"("sportType");

-- CreateIndex
CREATE UNIQUE INDEX "scoring_templates_sportType_formatType_key" ON "scoring_templates"("sportType", "formatType");

-- CreateIndex
CREATE INDEX "scoring_rules_templateId_idx" ON "scoring_rules"("templateId");

-- CreateIndex
CREATE INDEX "scoring_rules_templateId_statKey_idx" ON "scoring_rules"("templateId", "statKey");

-- CreateIndex
CREATE INDEX "league_scoring_overrides_leagueId_idx" ON "league_scoring_overrides"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "league_scoring_overrides_leagueId_statKey_key" ON "league_scoring_overrides"("leagueId", "statKey");

-- CreateIndex
CREATE UNIQUE INDEX "sport_feature_flags_sportType_key" ON "sport_feature_flags"("sportType");

-- CreateIndex
CREATE INDEX "schedule_templates_sportType_idx" ON "schedule_templates"("sportType");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_templates_sportType_formatType_key" ON "schedule_templates"("sportType", "formatType");

-- CreateIndex
CREATE INDEX "season_calendars_sportType_idx" ON "season_calendars"("sportType");

-- CreateIndex
CREATE UNIQUE INDEX "season_calendars_sportType_formatType_key" ON "season_calendars"("sportType", "formatType");

-- CreateIndex
CREATE INDEX "game_schedules_sportType_season_weekOrRound_idx" ON "game_schedules"("sportType", "season", "weekOrRound");

-- CreateIndex
CREATE INDEX "game_schedules_sportType_season_idx" ON "game_schedules"("sportType", "season");

-- CreateIndex
CREATE UNIQUE INDEX "game_schedules_sportType_season_weekOrRound_externalId_key" ON "game_schedules"("sportType", "season", "weekOrRound", "externalId");

-- CreateIndex
CREATE INDEX "player_game_stats_sportType_season_weekOrRound_idx" ON "player_game_stats"("sportType", "season", "weekOrRound");

-- CreateIndex
CREATE INDEX "player_game_stats_playerId_sportType_season_idx" ON "player_game_stats"("playerId", "sportType", "season");

-- CreateIndex
CREATE UNIQUE INDEX "player_game_stats_playerId_sportType_gameId_key" ON "player_game_stats"("playerId", "sportType", "gameId");

-- CreateIndex
CREATE INDEX "team_game_stats_sportType_season_weekOrRound_idx" ON "team_game_stats"("sportType", "season", "weekOrRound");

-- CreateIndex
CREATE UNIQUE INDEX "team_game_stats_sportType_gameId_teamId_key" ON "team_game_stats"("sportType", "gameId", "teamId");

-- CreateIndex
CREATE INDEX "stat_ingestion_jobs_sportType_season_idx" ON "stat_ingestion_jobs"("sportType", "season");

-- CreateIndex
CREATE INDEX "stat_ingestion_jobs_status_startedAt_idx" ON "stat_ingestion_jobs"("status", "startedAt");

-- CreateIndex
CREATE INDEX "player_meta_trends_sport_idx" ON "player_meta_trends"("sport");

-- CreateIndex
CREATE INDEX "player_meta_trends_trendScore_idx" ON "player_meta_trends"("trendScore");

-- CreateIndex
CREATE INDEX "player_meta_trends_trendingDirection_idx" ON "player_meta_trends"("trendingDirection");

-- CreateIndex
CREATE INDEX "player_meta_trends_updatedAt_idx" ON "player_meta_trends"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "player_meta_trends_playerId_sport_key" ON "player_meta_trends"("playerId", "sport");

-- CreateIndex
CREATE INDEX "trend_signal_events_playerId_sport_idx" ON "trend_signal_events"("playerId", "sport");

-- CreateIndex
CREATE INDEX "trend_signal_events_sport_signalType_timestamp_idx" ON "trend_signal_events"("sport", "signalType", "timestamp");

-- CreateIndex
CREATE INDEX "trend_signal_events_timestamp_idx" ON "trend_signal_events"("timestamp");

-- CreateIndex
CREATE INDEX "strategy_meta_reports_sport_idx" ON "strategy_meta_reports"("sport");

-- CreateIndex
CREATE INDEX "strategy_meta_reports_leagueFormat_idx" ON "strategy_meta_reports"("leagueFormat");

-- CreateIndex
CREATE UNIQUE INDEX "strategy_meta_reports_strategyType_sport_leagueFormat_key" ON "strategy_meta_reports"("strategyType", "sport", "leagueFormat");

-- CreateIndex
CREATE INDEX "global_meta_snapshots_sport_season_weekOrPeriod_idx" ON "global_meta_snapshots"("sport", "season", "weekOrPeriod");

-- CreateIndex
CREATE INDEX "global_meta_snapshots_metaType_sport_idx" ON "global_meta_snapshots"("metaType", "sport");

-- CreateIndex
CREATE INDEX "global_meta_snapshots_createdAt_idx" ON "global_meta_snapshots"("createdAt");

-- CreateIndex
CREATE INDEX "position_meta_trends_sport_idx" ON "position_meta_trends"("sport");

-- CreateIndex
CREATE INDEX "position_meta_trends_trendingDirection_idx" ON "position_meta_trends"("trendingDirection");

-- CreateIndex
CREATE UNIQUE INDEX "position_meta_trends_position_sport_key" ON "position_meta_trends"("position", "sport");

-- CreateIndex
CREATE INDEX "waiver_claims_leagueId_status_idx" ON "waiver_claims"("leagueId", "status");

-- CreateIndex
CREATE INDEX "waiver_claims_rosterId_idx" ON "waiver_claims"("rosterId");

-- CreateIndex
CREATE INDEX "waiver_claims_leagueId_priorityOrder_idx" ON "waiver_claims"("leagueId", "priorityOrder");

-- CreateIndex
CREATE INDEX "waiver_transactions_leagueId_processedAt_idx" ON "waiver_transactions"("leagueId", "processedAt");

-- CreateIndex
CREATE INDEX "waiver_transactions_rosterId_idx" ON "waiver_transactions"("rosterId");

-- CreateIndex
CREATE INDEX "waiver_pickups_userId_idx" ON "waiver_pickups"("userId");

-- CreateIndex
CREATE INDEX "waiver_pickups_leagueId_idx" ON "waiver_pickups"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "sleeper_leagues_sleeperLeagueId_key" ON "sleeper_leagues"("sleeperLeagueId");

-- CreateIndex
CREATE INDEX "sleeper_leagues_userId_sleeperLeagueId_idx" ON "sleeper_leagues"("userId", "sleeperLeagueId");

-- CreateIndex
CREATE INDEX "sleeper_rosters_leagueId_idx" ON "sleeper_rosters"("leagueId");

-- CreateIndex
CREATE INDEX "sleeper_rosters_ownerId_idx" ON "sleeper_rosters"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "sleeper_rosters_leagueId_rosterId_key" ON "sleeper_rosters"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX "RookieRanking_year_idx" ON "RookieRanking"("year");

-- CreateIndex
CREATE INDEX "RookieRanking_position_idx" ON "RookieRanking"("position");

-- CreateIndex
CREATE UNIQUE INDEX "RookieRanking_year_name_key" ON "RookieRanking"("year", "name");

-- CreateIndex
CREATE UNIQUE INDEX "mock_drafts_shareId_key" ON "mock_drafts"("shareId");

-- CreateIndex
CREATE UNIQUE INDEX "mock_drafts_inviteToken_key" ON "mock_drafts"("inviteToken");

-- CreateIndex
CREATE INDEX "mock_drafts_leagueId_idx" ON "mock_drafts"("leagueId");

-- CreateIndex
CREATE INDEX "mock_drafts_userId_idx" ON "mock_drafts"("userId");

-- CreateIndex
CREATE INDEX "mock_drafts_status_idx" ON "mock_drafts"("status");

-- CreateIndex
CREATE INDEX "mock_drafts_inviteToken_idx" ON "mock_drafts"("inviteToken");

-- CreateIndex
CREATE INDEX "mock_draft_chats_mockDraftId_idx" ON "mock_draft_chats"("mockDraftId");

-- CreateIndex
CREATE INDEX "draft_sessions_leagueId_idx" ON "draft_sessions"("leagueId");

-- CreateIndex
CREATE INDEX "draft_sessions_status_idx" ON "draft_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "draft_sessions_leagueId_key" ON "draft_sessions"("leagueId");

-- CreateIndex
CREATE INDEX "draft_picks_sessionId_idx" ON "draft_picks"("sessionId");

-- CreateIndex
CREATE INDEX "draft_picks_sessionId_rosterId_idx" ON "draft_picks"("sessionId", "rosterId");

-- CreateIndex
CREATE UNIQUE INDEX "draft_picks_sessionId_overall_key" ON "draft_picks"("sessionId", "overall");

-- CreateIndex
CREATE INDEX "draft_pick_trade_proposals_sessionId_idx" ON "draft_pick_trade_proposals"("sessionId");

-- CreateIndex
CREATE INDEX "draft_pick_trade_proposals_sessionId_receiverRosterId_idx" ON "draft_pick_trade_proposals"("sessionId", "receiverRosterId");

-- CreateIndex
CREATE INDEX "draft_pick_trade_proposals_sessionId_status_idx" ON "draft_pick_trade_proposals"("sessionId", "status");

-- CreateIndex
CREATE INDEX "ai_manager_audit_log_leagueId_idx" ON "ai_manager_audit_log"("leagueId");

-- CreateIndex
CREATE INDEX "ai_manager_audit_log_leagueId_rosterId_idx" ON "ai_manager_audit_log"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX "ai_manager_audit_log_leagueId_action_idx" ON "ai_manager_audit_log"("leagueId", "action");

-- CreateIndex
CREATE INDEX "ai_manager_audit_log_createdAt_idx" ON "ai_manager_audit_log"("createdAt");

-- CreateIndex
CREATE INDEX "draft_queues_sessionId_idx" ON "draft_queues"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "draft_queues_sessionId_userId_key" ON "draft_queues"("sessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "draft_import_backups_leagueId_key" ON "draft_import_backups"("leagueId");

-- CreateIndex
CREATE INDEX "draft_import_backups_leagueId_idx" ON "draft_import_backups"("leagueId");

-- CreateIndex
CREATE INDEX "rankings_backtest_results_leagueId_season_idx" ON "rankings_backtest_results"("leagueId", "season");

-- CreateIndex
CREATE INDEX "rankings_backtest_results_segmentKey_idx" ON "rankings_backtest_results"("segmentKey");

-- CreateIndex
CREATE INDEX "rankings_backtest_results_createdAt_idx" ON "rankings_backtest_results"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "rankings_backtest_results_leagueId_season_weekEvaluated_tar_key" ON "rankings_backtest_results"("leagueId", "season", "weekEvaluated", "targetType");

-- CreateIndex
CREATE INDEX "draft_prediction_snapshots_leagueId_season_idx" ON "draft_prediction_snapshots"("leagueId", "season");

-- CreateIndex
CREATE INDEX "draft_prediction_snapshots_userId_createdAt_idx" ON "draft_prediction_snapshots"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "draft_retrospectives_leagueId_season_idx" ON "draft_retrospectives"("leagueId", "season");

-- CreateIndex
CREATE INDEX "draft_retrospectives_snapshotId_idx" ON "draft_retrospectives"("snapshotId");

-- CreateIndex
CREATE INDEX "league_draft_calibrations_leagueId_idx" ON "league_draft_calibrations"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "league_draft_calibrations_leagueId_season_key" ON "league_draft_calibrations"("leagueId", "season");

-- CreateIndex
CREATE INDEX "ai_adp_snapshots_sport_idx" ON "ai_adp_snapshots"("sport");

-- CreateIndex
CREATE INDEX "ai_adp_snapshots_computedAt_idx" ON "ai_adp_snapshots"("computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ai_adp_snapshots_sport_leagueType_formatKey_key" ON "ai_adp_snapshots"("sport", "leagueType", "formatKey");

-- CreateIndex
CREATE INDEX "share_engagements_sleeperUsername_idx" ON "share_engagements"("sleeperUsername");

-- CreateIndex
CREATE INDEX "share_engagements_sleeperUsername_shareType_idx" ON "share_engagements"("sleeperUsername", "shareType");

-- CreateIndex
CREATE INDEX "share_engagements_createdAt_idx" ON "share_engagements"("createdAt");

-- CreateIndex
CREATE INDEX "platform_chat_threads_threadType_lastMessageAt_idx" ON "platform_chat_threads"("threadType", "lastMessageAt");

-- CreateIndex
CREATE INDEX "platform_chat_threads_createdByUserId_idx" ON "platform_chat_threads"("createdByUserId");

-- CreateIndex
CREATE INDEX "platform_chat_thread_members_userId_joinedAt_idx" ON "platform_chat_thread_members"("userId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "platform_chat_thread_members_threadId_userId_key" ON "platform_chat_thread_members"("threadId", "userId");

-- CreateIndex
CREATE INDEX "platform_chat_messages_threadId_createdAt_idx" ON "platform_chat_messages"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "platform_chat_messages_senderUserId_createdAt_idx" ON "platform_chat_messages"("senderUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "platform_notifications_sourceKey_key" ON "platform_notifications"("sourceKey");

-- CreateIndex
CREATE INDEX "platform_notifications_userId_createdAt_idx" ON "platform_notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "platform_notifications_userId_readAt_idx" ON "platform_notifications"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "web_push_subscriptions_endpoint_key" ON "web_push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "web_push_subscriptions_userId_idx" ON "web_push_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "engagement_events_userId_createdAt_idx" ON "engagement_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "engagement_events_userId_eventType_idx" ON "engagement_events"("userId", "eventType");

-- CreateIndex
CREATE INDEX "engagement_events_eventType_idx" ON "engagement_events"("eventType");

-- CreateIndex
CREATE INDEX "podcast_episodes_userId_idx" ON "podcast_episodes"("userId");

-- CreateIndex
CREATE INDEX "podcast_episodes_userId_createdAt_idx" ON "podcast_episodes"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "fantasy_media_episodes_userId_idx" ON "fantasy_media_episodes"("userId");

-- CreateIndex
CREATE INDEX "fantasy_media_episodes_userId_mediaType_idx" ON "fantasy_media_episodes"("userId", "mediaType");

-- CreateIndex
CREATE INDEX "fantasy_media_episodes_userId_createdAt_idx" ON "fantasy_media_episodes"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "fantasy_media_episodes_status_idx" ON "fantasy_media_episodes"("status");

-- CreateIndex
CREATE INDEX "fantasy_media_publish_logs_episodeId_idx" ON "fantasy_media_publish_logs"("episodeId");

-- CreateIndex
CREATE INDEX "social_clips_userId_idx" ON "social_clips"("userId");

-- CreateIndex
CREATE INDEX "social_clips_userId_createdAt_idx" ON "social_clips"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "social_content_assets_userId_idx" ON "social_content_assets"("userId");

-- CreateIndex
CREATE INDEX "social_content_assets_userId_assetType_idx" ON "social_content_assets"("userId", "assetType");

-- CreateIndex
CREATE INDEX "social_content_assets_userId_createdAt_idx" ON "social_content_assets"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "social_publish_targets_userId_idx" ON "social_publish_targets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "social_publish_targets_userId_platform_key" ON "social_publish_targets"("userId", "platform");

-- CreateIndex
CREATE INDEX "social_publish_logs_assetId_idx" ON "social_publish_logs"("assetId");

-- CreateIndex
CREATE INDEX "social_publish_logs_assetId_platform_idx" ON "social_publish_logs"("assetId", "platform");

-- CreateIndex
CREATE INDEX "shareable_moments_userId_idx" ON "shareable_moments"("userId");

-- CreateIndex
CREATE INDEX "shareable_moments_userId_shareType_idx" ON "shareable_moments"("userId", "shareType");

-- CreateIndex
CREATE INDEX "shareable_moments_userId_createdAt_idx" ON "shareable_moments"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "share_publish_logs_shareId_idx" ON "share_publish_logs"("shareId");

-- CreateIndex
CREATE INDEX "share_publish_logs_shareId_platform_idx" ON "share_publish_logs"("shareId", "platform");

-- CreateIndex
CREATE INDEX "platform_blocked_users_blockerUserId_idx" ON "platform_blocked_users"("blockerUserId");

-- CreateIndex
CREATE INDEX "platform_blocked_users_blockedUserId_idx" ON "platform_blocked_users"("blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_blocked_users_blockerUserId_blockedUserId_key" ON "platform_blocked_users"("blockerUserId", "blockedUserId");

-- CreateIndex
CREATE INDEX "platform_message_reports_reporterUserId_idx" ON "platform_message_reports"("reporterUserId");

-- CreateIndex
CREATE INDEX "platform_message_reports_messageId_threadId_idx" ON "platform_message_reports"("messageId", "threadId");

-- CreateIndex
CREATE INDEX "platform_user_reports_reporterUserId_idx" ON "platform_user_reports"("reporterUserId");

-- CreateIndex
CREATE INDEX "platform_user_reports_reportedUserId_idx" ON "platform_user_reports"("reportedUserId");

-- CreateIndex
CREATE INDEX "platform_moderation_actions_userId_idx" ON "platform_moderation_actions"("userId");

-- CreateIndex
CREATE INDEX "platform_moderation_actions_userId_actionType_idx" ON "platform_moderation_actions"("userId", "actionType");

-- CreateIndex
CREATE INDEX "platform_moderation_actions_expiresAt_idx" ON "platform_moderation_actions"("expiresAt");

-- CreateIndex
CREATE INDEX "admin_audit_log_adminUserId_idx" ON "admin_audit_log"("adminUserId");

-- CreateIndex
CREATE INDEX "admin_audit_log_action_idx" ON "admin_audit_log"("action");

-- CreateIndex
CREATE INDEX "admin_audit_log_createdAt_idx" ON "admin_audit_log"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "platform_wallet_accounts_userId_key" ON "platform_wallet_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_ledger_entries_sourceKey_key" ON "wallet_ledger_entries"("sourceKey");

-- CreateIndex
CREATE INDEX "wallet_ledger_entries_walletAccountId_createdAt_idx" ON "wallet_ledger_entries"("walletAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_ledger_entries_userId_createdAt_idx" ON "wallet_ledger_entries"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_ledger_entries_entryType_status_idx" ON "wallet_ledger_entries"("entryType", "status");

-- CreateIndex
CREATE INDEX "season_forecast_snapshots_leagueId_season_week_idx" ON "season_forecast_snapshots"("leagueId", "season", "week");

-- CreateIndex
CREATE UNIQUE INDEX "season_forecast_snapshots_leagueId_season_week_key" ON "season_forecast_snapshots"("leagueId", "season", "week");

-- CreateIndex
CREATE INDEX "dynasty_projection_snapshots_leagueId_season_idx" ON "dynasty_projection_snapshots"("leagueId", "season");

-- CreateIndex
CREATE INDEX "dynasty_projection_snapshots_leagueId_teamId_season_idx" ON "dynasty_projection_snapshots"("leagueId", "teamId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "dynasty_projection_snapshots_leagueId_teamId_season_key" ON "dynasty_projection_snapshots"("leagueId", "teamId", "season");

-- CreateIndex
CREATE INDEX "player_career_projections_sport_season_idx" ON "player_career_projections"("sport", "season");

-- CreateIndex
CREATE INDEX "player_career_projections_sport_playerId_season_idx" ON "player_career_projections"("sport", "playerId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "player_career_projections_sport_playerId_season_key" ON "player_career_projections"("sport", "playerId", "season");

-- CreateIndex
CREATE INDEX "team_window_profiles_leagueId_season_idx" ON "team_window_profiles"("leagueId", "season");

-- CreateIndex
CREATE INDEX "team_window_profiles_leagueId_teamId_season_idx" ON "team_window_profiles"("leagueId", "teamId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "team_window_profiles_leagueId_teamId_season_key" ON "team_window_profiles"("leagueId", "teamId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "graph_nodes_nodeId_key" ON "graph_nodes"("nodeId");

-- CreateIndex
CREATE INDEX "graph_nodes_leagueId_season_idx" ON "graph_nodes"("leagueId", "season");

-- CreateIndex
CREATE INDEX "graph_nodes_nodeType_leagueId_idx" ON "graph_nodes"("nodeType", "leagueId");

-- CreateIndex
CREATE INDEX "graph_nodes_entityId_leagueId_idx" ON "graph_nodes"("entityId", "leagueId");

-- CreateIndex
CREATE INDEX "graph_nodes_leagueId_sport_idx" ON "graph_nodes"("leagueId", "sport");

-- CreateIndex
CREATE UNIQUE INDEX "graph_edges_edgeId_key" ON "graph_edges"("edgeId");

-- CreateIndex
CREATE INDEX "graph_edges_fromNodeId_idx" ON "graph_edges"("fromNodeId");

-- CreateIndex
CREATE INDEX "graph_edges_toNodeId_idx" ON "graph_edges"("toNodeId");

-- CreateIndex
CREATE INDEX "graph_edges_edgeType_season_idx" ON "graph_edges"("edgeType", "season");

-- CreateIndex
CREATE INDEX "graph_edges_fromNodeId_toNodeId_edgeType_idx" ON "graph_edges"("fromNodeId", "toNodeId", "edgeType");

-- CreateIndex
CREATE INDEX "graph_edges_edgeType_sport_idx" ON "graph_edges"("edgeType", "sport");

-- CreateIndex
CREATE INDEX "league_graph_snapshots_leagueId_season_idx" ON "league_graph_snapshots"("leagueId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "league_graph_snapshots_leagueId_season_key" ON "league_graph_snapshots"("leagueId", "season");

-- CreateIndex
CREATE INDEX "league_dynasty_seasons_leagueId_idx" ON "league_dynasty_seasons"("leagueId");

-- CreateIndex
CREATE INDEX "league_dynasty_seasons_platformLeagueId_idx" ON "league_dynasty_seasons"("platformLeagueId");

-- CreateIndex
CREATE UNIQUE INDEX "league_dynasty_seasons_leagueId_season_key" ON "league_dynasty_seasons"("leagueId", "season");

-- CreateIndex
CREATE INDEX "dynasty_backfill_status_leagueId_idx" ON "dynasty_backfill_status"("leagueId");

-- CreateIndex
CREATE INDEX "dynasty_backfill_status_status_idx" ON "dynasty_backfill_status"("status");

-- CreateIndex
CREATE UNIQUE INDEX "dynasty_backfill_status_leagueId_provider_key" ON "dynasty_backfill_status"("leagueId", "provider");

-- CreateIndex
CREATE INDEX "dw_player_game_facts_playerId_sport_idx" ON "dw_player_game_facts"("playerId", "sport");

-- CreateIndex
CREATE INDEX "dw_player_game_facts_sport_scoringPeriod_idx" ON "dw_player_game_facts"("sport", "scoringPeriod");

-- CreateIndex
CREATE INDEX "dw_player_game_facts_sport_season_weekOrRound_idx" ON "dw_player_game_facts"("sport", "season", "weekOrRound");

-- CreateIndex
CREATE INDEX "dw_player_game_facts_gameId_idx" ON "dw_player_game_facts"("gameId");

-- CreateIndex
CREATE INDEX "dw_team_game_facts_teamId_sport_idx" ON "dw_team_game_facts"("teamId", "sport");

-- CreateIndex
CREATE INDEX "dw_team_game_facts_sport_season_weekOrRound_idx" ON "dw_team_game_facts"("sport", "season", "weekOrRound");

-- CreateIndex
CREATE INDEX "dw_team_game_facts_gameId_idx" ON "dw_team_game_facts"("gameId");

-- CreateIndex
CREATE INDEX "dw_roster_snapshots_leagueId_weekOrPeriod_idx" ON "dw_roster_snapshots"("leagueId", "weekOrPeriod");

-- CreateIndex
CREATE INDEX "dw_roster_snapshots_teamId_sport_idx" ON "dw_roster_snapshots"("teamId", "sport");

-- CreateIndex
CREATE INDEX "dw_roster_snapshots_sport_season_idx" ON "dw_roster_snapshots"("sport", "season");

-- CreateIndex
CREATE INDEX "dw_matchup_facts_leagueId_weekOrPeriod_idx" ON "dw_matchup_facts"("leagueId", "weekOrPeriod");

-- CreateIndex
CREATE INDEX "dw_matchup_facts_leagueId_season_idx" ON "dw_matchup_facts"("leagueId", "season");

-- CreateIndex
CREATE INDEX "dw_draft_facts_leagueId_idx" ON "dw_draft_facts"("leagueId");

-- CreateIndex
CREATE INDEX "dw_draft_facts_leagueId_round_idx" ON "dw_draft_facts"("leagueId", "round");

-- CreateIndex
CREATE INDEX "dw_draft_facts_playerId_sport_idx" ON "dw_draft_facts"("playerId", "sport");

-- CreateIndex
CREATE INDEX "dw_transaction_facts_leagueId_createdAt_idx" ON "dw_transaction_facts"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX "dw_transaction_facts_playerId_sport_idx" ON "dw_transaction_facts"("playerId", "sport");

-- CreateIndex
CREATE INDEX "dw_transaction_facts_type_idx" ON "dw_transaction_facts"("type");

-- CreateIndex
CREATE INDEX "dw_season_standing_facts_leagueId_season_idx" ON "dw_season_standing_facts"("leagueId", "season");

-- CreateIndex
CREATE INDEX "dw_season_standing_facts_teamId_sport_idx" ON "dw_season_standing_facts"("teamId", "sport");

-- CreateIndex
CREATE UNIQUE INDEX "dw_season_standing_facts_leagueId_season_teamId_key" ON "dw_season_standing_facts"("leagueId", "season", "teamId");

-- CreateIndex
CREATE INDEX "sim_matchup_results_leagueId_weekOrPeriod_idx" ON "sim_matchup_results"("leagueId", "weekOrPeriod");

-- CreateIndex
CREATE INDEX "sim_matchup_results_sport_idx" ON "sim_matchup_results"("sport");

-- CreateIndex
CREATE INDEX "sim_season_results_leagueId_season_weekOrPeriod_idx" ON "sim_season_results"("leagueId", "season", "weekOrPeriod");

-- CreateIndex
CREATE INDEX "sim_season_results_teamId_idx" ON "sim_season_results"("teamId");

-- CreateIndex
CREATE INDEX "sim_season_results_sport_idx" ON "sim_season_results"("sport");

-- CreateIndex
CREATE INDEX "dynasty_projections_leagueId_idx" ON "dynasty_projections"("leagueId");

-- CreateIndex
CREATE INDEX "dynasty_projections_teamId_idx" ON "dynasty_projections"("teamId");

-- CreateIndex
CREATE INDEX "dynasty_projections_sport_idx" ON "dynasty_projections"("sport");

-- CreateIndex
CREATE UNIQUE INDEX "dynasty_projections_leagueId_teamId_key" ON "dynasty_projections"("leagueId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_config_key_key" ON "platform_config"("key");

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
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "blog_publish_logs" ADD CONSTRAINT "blog_publish_logs_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "blog_articles"("articleId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verify_tokens" ADD CONSTRAINT "email_verify_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_legacyLeagueId_fkey" FOREIGN KEY ("legacyLeagueId") REFERENCES "LegacyLeague"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "league_chat_messages" ADD CONSTRAINT "league_chat_messages_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_chat_messages" ADD CONSTRAINT "league_chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "zombie_universe_levels" ADD CONSTRAINT "zombie_universe_levels_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "zombie_universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_leagues" ADD CONSTRAINT "zombie_leagues_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "zombie_universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_leagues" ADD CONSTRAINT "zombie_leagues_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "zombie_universe_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zombie_leagues" ADD CONSTRAINT "zombie_leagues_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "devy_league_configs" ADD CONSTRAINT "devy_league_configs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "zombie_league_teams" ADD CONSTRAINT "zombie_league_teams_zombieLeagueId_fkey" FOREIGN KEY ("zombieLeagueId") REFERENCES "zombie_leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "platform_wallet_accounts" ADD CONSTRAINT "platform_wallet_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_walletAccountId_fkey" FOREIGN KEY ("walletAccountId") REFERENCES "platform_wallet_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


