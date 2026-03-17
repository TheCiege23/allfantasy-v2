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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shareable_moments_userId_idx" ON "shareable_moments"("userId");
CREATE INDEX IF NOT EXISTS "shareable_moments_userId_shareType_idx" ON "shareable_moments"("userId", "shareType");
CREATE INDEX IF NOT EXISTS "shareable_moments_userId_createdAt_idx" ON "shareable_moments"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "share_publish_logs_shareId_idx" ON "share_publish_logs"("shareId");
CREATE INDEX IF NOT EXISTS "share_publish_logs_shareId_platform_idx" ON "share_publish_logs"("shareId", "platform");

-- AddForeignKey
ALTER TABLE "shareable_moments" ADD CONSTRAINT "shareable_moments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "share_publish_logs" ADD CONSTRAINT "share_publish_logs_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "shareable_moments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
