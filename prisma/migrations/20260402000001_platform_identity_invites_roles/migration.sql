-- PlatformIdentity
CREATE TABLE IF NOT EXISTS "PlatformIdentity" (
  "id"               TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "platform"         TEXT NOT NULL,
  "platformUserId"   TEXT NOT NULL,
  "platformUsername" TEXT NOT NULL,
  "displayName"      TEXT,
  "avatarUrl"        TEXT,
  "sport"            TEXT NOT NULL DEFAULT 'nfl',
  "isVerified"       BOOLEAN NOT NULL DEFAULT false,
  "rankLocked"       BOOLEAN NOT NULL DEFAULT false,
  "firstImportAt"    TIMESTAMP(3),
  "lastSyncedAt"     TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformIdentity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformIdentity_platform_platformUserId_key"
  ON "PlatformIdentity"("platform","platformUserId");
CREATE INDEX IF NOT EXISTS "PlatformIdentity_userId_idx"
  ON "PlatformIdentity"("userId");

-- LeagueInvite
CREATE TABLE IF NOT EXISTS "LeagueInvite" (
  "id"        TEXT NOT NULL,
  "leagueId"  TEXT NOT NULL,
  "token"     TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "maxUses"   INTEGER NOT NULL DEFAULT 50,
  "useCount"  INTEGER NOT NULL DEFAULT 0,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeagueInvite_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeagueInvite_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "LeagueInvite_token_key"
  ON "LeagueInvite"("token");
CREATE INDEX IF NOT EXISTS "LeagueInvite_leagueId_idx"
  ON "LeagueInvite"("leagueId");

-- LeagueManagerClaim
CREATE TABLE IF NOT EXISTS "LeagueManagerClaim" (
  "id"             TEXT NOT NULL,
  "leagueId"       TEXT NOT NULL,
  "afUserId"       TEXT NOT NULL,
  "teamExternalId" TEXT NOT NULL,
  "platformUserId" TEXT,
  "claimedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isConfirmed"    BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "LeagueManagerClaim_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeagueManagerClaim_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LeagueManagerClaim_leagueId_afUserId_key"
  ON "LeagueManagerClaim"("leagueId","afUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "LeagueManagerClaim_leagueId_teamExternalId_key"
  ON "LeagueManagerClaim"("leagueId","teamExternalId");

-- LeagueTeam new columns
ALTER TABLE "league_teams"
  ADD COLUMN IF NOT EXISTS "role"            TEXT NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS "isOrphan"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "claimedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "platformUserId"  TEXT;

-- LegacyUserRankCache new columns
ALTER TABLE "legacy_user_rank_cache"
  ADD COLUMN IF NOT EXISTS "rank_import_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "rank_sources"      JSONB,
  ADD COLUMN IF NOT EXISTS "last_rank_reset_at" TIMESTAMP(3);
