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
CREATE TYPE "LeagueSport" AS ENUM ('NFL', 'NBA', 'MLB');

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
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,

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
    "sport" TEXT NOT NULL DEFAULT 'NFL',
    "status" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "espnId" TEXT,
    "fleaflickerId" TEXT,

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
    "content" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "playerName" TEXT,
    "playerId" TEXT,
    "team" TEXT,
    "category" TEXT,
    "publishedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "author" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "playerNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sentiment" TEXT,
    "sourceId" TEXT,
    "teams" TEXT[] DEFAULT ARRAY[]::TEXT[],

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
    "lastRecalibrationAt" TIMESTAMP(3),
    "lastCalibrated" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isotonicComputedAt" TIMESTAMP(3),
    "isotonicMapJson" JSONB,
    "isotonicSampleSize" INTEGER,

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
    "status" VARCHAR(32) NOT NULL,
    "version" VARCHAR(48) NOT NULL,
    "nSamples" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "compositeParamsJson" JSONB,

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metricsJson" JSONB,

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
    "nilImpactScore" DOUBLE PRECISION,
    "injurySeverityScore" DOUBLE PRECISION,
    "athleticProfileScore" DOUBLE PRECISION,
    "productionIndex" DOUBLE PRECISION,
    "volatilityScore" DOUBLE PRECISION,
    "nflDraftRound" INTEGER,
    "nflDraftPick" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'cfbd',
    "lastClassifiedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "declaredDraftYear" INTEGER,
    "draftStatus" TEXT NOT NULL DEFAULT 'college',
    "lastRosterYear" INTEGER,
    "statusConfidence" INTEGER NOT NULL DEFAULT 0,
    "statusSource" TEXT,
    "statusUpdatedAt" TIMESTAMP(3),
    "ppaPass" DOUBLE PRECISION,
    "ppaRush" DOUBLE PRECISION,
    "ppaTotal" DOUBLE PRECISION,
    "recruitingCity" TEXT,
    "recruitingState" TEXT,
    "returningProdPct" DOUBLE PRECISION,
    "teamSpRating" DOUBLE PRECISION,
    "transferEligibility" TEXT,
    "transferFromSchool" TEXT,
    "transferToSchool" TEXT,
    "usageOverall" DOUBLE PRECISION,
    "usagePass" DOUBLE PRECISION,
    "usageRush" DOUBLE PRECISION,
    "wepaPass" DOUBLE PRECISION,
    "wepaRush" DOUBLE PRECISION,
    "wepaTotal" DOUBLE PRECISION,

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "insuredNodeId" TEXT,
    "integrityHash" TEXT,
    "invalidatedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "scoredAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3),
    "tiebreakerPoints" INTEGER,

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imageUrl" TEXT,
    "metadata" JSONB,
    "replyToId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'text',

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "avatarPreset" TEXT,
    "preferredLanguage" TEXT,
    "timezone" TEXT,

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
    "legacyLeagueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rosters" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "playerData" JSONB NOT NULL,
    "faabRemaining" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "waiverPriority" INTEGER,

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
    "legacyRosterId" TEXT,

    CONSTRAINT "league_teams_pkey" PRIMARY KEY ("id")
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
    "leagueId" TEXT,
    "userId" TEXT NOT NULL,
    "rounds" INTEGER NOT NULL DEFAULT 15,
    "results" JSONB NOT NULL,
    "proposals" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "mock_drafts_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "manager_dna_sleeperUsername_key" ON "manager_dna"("sleeperUsername");

-- CreateIndex
CREATE INDEX "manager_dna_sleeperUserId_idx" ON "manager_dna"("sleeperUserId");

-- CreateIndex
CREATE INDEX "manager_dna_lastComputedAt_idx" ON "manager_dna"("lastComputedAt");

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
CREATE INDEX "leagues_userId_isDynasty_idx" ON "leagues"("userId", "isDynasty");

-- CreateIndex
CREATE INDEX "leagues_sport_season_idx" ON "leagues"("sport", "season");

-- CreateIndex
CREATE INDEX "leagues_status_idx" ON "leagues"("status");

-- CreateIndex
CREATE UNIQUE INDEX "leagues_userId_platform_platformLeagueId_key" ON "leagues"("userId", "platform", "platformLeagueId");

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
CREATE INDEX "league_teams_aiPowerScore_idx" ON "league_teams"("aiPowerScore");

-- CreateIndex
CREATE UNIQUE INDEX "league_teams_leagueId_externalId_key" ON "league_teams"("leagueId", "externalId");

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
CREATE INDEX "mock_drafts_leagueId_idx" ON "mock_drafts"("leagueId");

-- CreateIndex
CREATE INDEX "mock_drafts_userId_idx" ON "mock_drafts"("userId");

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
CREATE UNIQUE INDEX "platform_wallet_accounts_userId_key" ON "platform_wallet_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_ledger_entries_sourceKey_key" ON "wallet_ledger_entries"("sourceKey");

-- CreateIndex
CREATE INDEX "wallet_ledger_entries_walletAccountId_createdAt_idx" ON "wallet_ledger_entries"("walletAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_ledger_entries_userId_createdAt_idx" ON "wallet_ledger_entries"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_ledger_entries_entryType_status_idx" ON "wallet_ledger_entries"("entryType", "status");

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
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketNode" ADD CONSTRAINT "BracketNode_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "BracketTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketLeague" ADD CONSTRAINT "BracketLeague_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketLeague" ADD CONSTRAINT "BracketLeague_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "BracketTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "bracket_league_messages" ADD CONSTRAINT "bracket_league_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "bracket_league_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_league_messages" ADD CONSTRAINT "bracket_league_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_message_reactions" ADD CONSTRAINT "bracket_message_reactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "bracket_league_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_message_reactions" ADD CONSTRAINT "bracket_message_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketPayment" ADD CONSTRAINT "BracketPayment_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "BracketLeague"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketPayment" ADD CONSTRAINT "BracketPayment_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "BracketTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketPayment" ADD CONSTRAINT "BracketPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_risk_profiles" ADD CONSTRAINT "bracket_risk_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verify_tokens" ADD CONSTRAINT "email_verify_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_legacyLeagueId_fkey" FOREIGN KEY ("legacyLeagueId") REFERENCES "LegacyLeague"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_teams" ADD CONSTRAINT "league_teams_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_teams" ADD CONSTRAINT "league_teams_legacyRosterId_fkey" FOREIGN KEY ("legacyRosterId") REFERENCES "LegacyRoster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_performances" ADD CONSTRAINT "team_performances_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "league_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_auths" ADD CONSTRAINT "league_auths_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_waiver_settings" ADD CONSTRAINT "league_waiver_settings_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "draft_retrospectives" ADD CONSTRAINT "draft_retrospectives_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "draft_prediction_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_chat_threads" ADD CONSTRAINT "platform_chat_threads_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_chat_thread_members" ADD CONSTRAINT "platform_chat_thread_members_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "platform_chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_chat_thread_members" ADD CONSTRAINT "platform_chat_thread_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_chat_messages" ADD CONSTRAINT "platform_chat_messages_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_chat_messages" ADD CONSTRAINT "platform_chat_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "platform_chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_notifications" ADD CONSTRAINT "platform_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_wallet_accounts" ADD CONSTRAINT "platform_wallet_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_walletAccountId_fkey" FOREIGN KEY ("walletAccountId") REFERENCES "platform_wallet_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

