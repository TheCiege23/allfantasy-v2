-- AF War Room AI: new tables + LeagueSettings + UserProfile columns.
-- Note: draft_sessions, draft_picks, draft_queues, draft_queue_entries already exist — used by live draft.

ALTER TABLE "league_settings" ADD COLUMN IF NOT EXISTS "aiWarRoomEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "league_settings" ADD COLUMN IF NOT EXISTS "aiPlayerOutlookEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "league_settings" ADD COLUMN IF NOT EXISTS "aiPlayerCompareEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "league_settings" ADD COLUMN IF NOT EXISTS "aiContingencyEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "league_settings" ADD COLUMN IF NOT EXISTS "aiManagerTendencyEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "league_settings" ADD COLUMN IF NOT EXISTS "aiPostDraftReportEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "league_settings" ADD COLUMN IF NOT EXISTS "aiDefaultStrategyMode" VARCHAR(32);
ALTER TABLE "league_settings" ADD COLUMN IF NOT EXISTS "aiAggressiveness" VARCHAR(16);
ALTER TABLE "league_settings" ADD COLUMN IF NOT EXISTS "aiRookieBias" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "league_settings" ADD COLUMN IF NOT EXISTS "aiStackPreference" VARCHAR(32);
ALTER TABLE "league_settings" ADD COLUMN IF NOT EXISTS "aiRiskTolerance" VARCHAR(16);

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "riskProfile" VARCHAR(32);
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "draftStyle" VARCHAR(32);
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "dynastyWindow" VARCHAR(32);
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "preferredBuild" VARCHAR(64);
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "preferredPositionsJson" JSONB;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "fadePositionsJson" JSONB;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "aiStrategyModeDefault" VARCHAR(32);
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "aiExplanationStyle" VARCHAR(32);
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "aiVoicePreference" VARCHAR(64);

CREATE TABLE IF NOT EXISTS "war_room_snapshots" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "draftSessionId" TEXT,
    "sport" "LeagueSport" NOT NULL DEFAULT 'NFL',
    "season" INTEGER,
    "snapshotKind" VARCHAR(32) NOT NULL DEFAULT 'in_draft',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "war_room_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "war_room_snapshots_leagueId_createdAt_idx" ON "war_room_snapshots"("leagueId", "createdAt");
CREATE INDEX IF NOT EXISTS "war_room_snapshots_userId_createdAt_idx" ON "war_room_snapshots"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "war_room_snapshots_draftSessionId_idx" ON "war_room_snapshots"("draftSessionId");

ALTER TABLE "war_room_snapshots" ADD CONSTRAINT "war_room_snapshots_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "war_room_snapshots" ADD CONSTRAINT "war_room_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "war_room_snapshots" ADD CONSTRAINT "war_room_snapshots_draftSessionId_fkey" FOREIGN KEY ("draftSessionId") REFERENCES "draft_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "player_outlooks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT,
    "sport" "LeagueSport" NOT NULL DEFAULT 'NFL',
    "season" INTEGER,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "position" VARCHAR(16),
    "team" VARCHAR(16),
    "summary" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "detailJson" JSONB,
    "source" VARCHAR(24) NOT NULL DEFAULT 'ai',
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "player_outlooks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "player_outlooks_userId_playerId_sport_idx" ON "player_outlooks"("userId", "playerId", "sport");
CREATE INDEX IF NOT EXISTS "player_outlooks_leagueId_season_idx" ON "player_outlooks"("leagueId", "season");

ALTER TABLE "player_outlooks" ADD CONSTRAINT "player_outlooks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "player_outlooks" ADD CONSTRAINT "player_outlooks_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "manager_tendencies" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "rosterId" TEXT NOT NULL,
    "sport" "LeagueSport" NOT NULL DEFAULT 'NFL',
    "label" VARCHAR(128),
    "tendenciesJson" JSONB NOT NULL DEFAULT '{}',
    "samplePicks" INTEGER NOT NULL DEFAULT 0,
    "lastComputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "manager_tendencies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "manager_tendencies_leagueId_rosterId_season_key" ON "manager_tendencies"("leagueId", "rosterId", "season");
CREATE INDEX IF NOT EXISTS "manager_tendencies_leagueId_season_idx" ON "manager_tendencies"("leagueId", "season");

ALTER TABLE "manager_tendencies" ADD CONSTRAINT "manager_tendencies_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ai_recommendation_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT,
    "draftSessionId" TEXT,
    "feature" VARCHAR(64) NOT NULL,
    "inputJson" JSONB NOT NULL DEFAULT '{}',
    "outputJson" JSONB NOT NULL DEFAULT '{}',
    "providerSummary" TEXT,
    "tokenEstimate" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_recommendation_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_recommendation_logs_userId_createdAt_idx" ON "ai_recommendation_logs"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ai_recommendation_logs_leagueId_feature_idx" ON "ai_recommendation_logs"("leagueId", "feature");
CREATE INDEX IF NOT EXISTS "ai_recommendation_logs_feature_createdAt_idx" ON "ai_recommendation_logs"("feature", "createdAt");

ALTER TABLE "ai_recommendation_logs" ADD CONSTRAINT "ai_recommendation_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_recommendation_logs" ADD CONSTRAINT "ai_recommendation_logs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_recommendation_logs" ADD CONSTRAINT "ai_recommendation_logs_draftSessionId_fkey" FOREIGN KEY ("draftSessionId") REFERENCES "draft_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
