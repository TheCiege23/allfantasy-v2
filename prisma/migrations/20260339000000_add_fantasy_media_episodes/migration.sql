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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "fantasy_media_episodes_userId_idx" ON "fantasy_media_episodes"("userId");
CREATE INDEX IF NOT EXISTS "fantasy_media_episodes_userId_mediaType_idx" ON "fantasy_media_episodes"("userId", "mediaType");
CREATE INDEX IF NOT EXISTS "fantasy_media_episodes_userId_createdAt_idx" ON "fantasy_media_episodes"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "fantasy_media_episodes_status_idx" ON "fantasy_media_episodes"("status");
CREATE INDEX IF NOT EXISTS "fantasy_media_publish_logs_episodeId_idx" ON "fantasy_media_publish_logs"("episodeId");

-- AddForeignKey
ALTER TABLE "fantasy_media_episodes" ADD CONSTRAINT "fantasy_media_episodes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fantasy_media_publish_logs" ADD CONSTRAINT "fantasy_media_publish_logs_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "fantasy_media_episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
