-- Devy multi-source import / merge engine

CREATE TABLE IF NOT EXISTS "devy_import_sessions" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "commissionerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "summary" JSONB,
    "approvedAt" TIMESTAMP(3),
    "mergedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "devy_import_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "devy_import_sessions_leagueId_idx" ON "devy_import_sessions"("leagueId");
CREATE INDEX IF NOT EXISTS "devy_import_sessions_commissionerId_idx" ON "devy_import_sessions"("commissionerId");

ALTER TABLE "devy_import_sessions" DROP CONSTRAINT IF EXISTS "devy_import_sessions_leagueId_fkey";
ALTER TABLE "devy_import_sessions" ADD CONSTRAINT "devy_import_sessions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devy_import_sessions" DROP CONSTRAINT IF EXISTS "devy_import_sessions_commissionerId_fkey";
ALTER TABLE "devy_import_sessions" ADD CONSTRAINT "devy_import_sessions_commissionerId_fkey" FOREIGN KEY ("commissionerId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

CREATE INDEX IF NOT EXISTS "devy_import_sources_sessionId_idx" ON "devy_import_sources"("sessionId");

ALTER TABLE "devy_import_sources" DROP CONSTRAINT IF EXISTS "devy_import_sources_sessionId_fkey";
ALTER TABLE "devy_import_sources" ADD CONSTRAINT "devy_import_sources_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "devy_import_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

CREATE INDEX IF NOT EXISTS "devy_player_mappings_sessionId_idx" ON "devy_player_mappings"("sessionId");
CREATE INDEX IF NOT EXISTS "devy_player_mappings_sessionId_externalId_externalPlatform_idx" ON "devy_player_mappings"("sessionId", "externalId", "externalPlatform");

ALTER TABLE "devy_player_mappings" DROP CONSTRAINT IF EXISTS "devy_player_mappings_sessionId_fkey";
ALTER TABLE "devy_player_mappings" ADD CONSTRAINT "devy_player_mappings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "devy_import_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

CREATE INDEX IF NOT EXISTS "devy_manager_mappings_sessionId_idx" ON "devy_manager_mappings"("sessionId");

ALTER TABLE "devy_manager_mappings" DROP CONSTRAINT IF EXISTS "devy_manager_mappings_sessionId_fkey";
ALTER TABLE "devy_manager_mappings" ADD CONSTRAINT "devy_manager_mappings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "devy_import_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

CREATE INDEX IF NOT EXISTS "devy_merge_conflicts_sessionId_idx" ON "devy_merge_conflicts"("sessionId");
CREATE INDEX IF NOT EXISTS "devy_merge_conflicts_sessionId_resolution_idx" ON "devy_merge_conflicts"("sessionId", "resolution");

ALTER TABLE "devy_merge_conflicts" DROP CONSTRAINT IF EXISTS "devy_merge_conflicts_sessionId_fkey";
ALTER TABLE "devy_merge_conflicts" ADD CONSTRAINT "devy_merge_conflicts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "devy_import_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

CREATE INDEX IF NOT EXISTS "devy_imported_seasons_leagueId_season_idx" ON "devy_imported_seasons"("leagueId", "season");
CREATE INDEX IF NOT EXISTS "devy_imported_seasons_sessionId_idx" ON "devy_imported_seasons"("sessionId");

ALTER TABLE "devy_imported_seasons" DROP CONSTRAINT IF EXISTS "devy_imported_seasons_leagueId_fkey";
ALTER TABLE "devy_imported_seasons" ADD CONSTRAINT "devy_imported_seasons_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devy_imported_seasons" DROP CONSTRAINT IF EXISTS "devy_imported_seasons_sessionId_fkey";
ALTER TABLE "devy_imported_seasons" ADD CONSTRAINT "devy_imported_seasons_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "devy_import_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
