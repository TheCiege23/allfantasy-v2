-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeagueSport" ADD VALUE 'NHL';
ALTER TYPE "LeagueSport" ADD VALUE 'NCAAF';
ALTER TYPE "LeagueSport" ADD VALUE 'NCAAB';
ALTER TYPE "LeagueSport" ADD VALUE 'SOCCER';

-- AlterTable
ALTER TABLE "PlayerIdentityMap" ADD COLUMN     "clearSportsId" TEXT;

-- AlterTable
ALTER TABLE "SportsGame" ADD COLUMN     "raw" JSONB;

-- AlterTable
ALTER TABLE "SportsInjury" ADD COLUMN     "raw" JSONB;

-- AlterTable
ALTER TABLE "leagues" ADD COLUMN     "leagueVariant" VARCHAR(32);

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
CREATE INDEX "PlayerIdentityMap_clearSportsId_idx" ON "PlayerIdentityMap"("clearSportsId");

-- AddForeignKey
ALTER TABLE "roster_template_slots" ADD CONSTRAINT "roster_template_slots_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "roster_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_rules" ADD CONSTRAINT "scoring_rules_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "scoring_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
