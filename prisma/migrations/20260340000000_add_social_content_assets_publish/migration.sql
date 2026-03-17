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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "social_content_assets_userId_idx" ON "social_content_assets"("userId");
CREATE INDEX IF NOT EXISTS "social_content_assets_userId_assetType_idx" ON "social_content_assets"("userId", "assetType");
CREATE INDEX IF NOT EXISTS "social_content_assets_userId_createdAt_idx" ON "social_content_assets"("userId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "social_publish_targets_userId_platform_key" ON "social_publish_targets"("userId", "platform");
CREATE INDEX IF NOT EXISTS "social_publish_targets_userId_idx" ON "social_publish_targets"("userId");
CREATE INDEX IF NOT EXISTS "social_publish_logs_assetId_idx" ON "social_publish_logs"("assetId");
CREATE INDEX IF NOT EXISTS "social_publish_logs_assetId_platform_idx" ON "social_publish_logs"("assetId", "platform");

-- AddForeignKey
ALTER TABLE "social_content_assets" ADD CONSTRAINT "social_content_assets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_publish_targets" ADD CONSTRAINT "social_publish_targets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_publish_logs" ADD CONSTRAINT "social_publish_logs_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "social_content_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
