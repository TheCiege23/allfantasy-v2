-- Admin-managed brand social accounts + posts (marketing from your own channels).
-- Separate from user-scoped SocialPublishTarget so brand credentials never bleed
-- into the user flow.

CREATE TABLE IF NOT EXISTS "brand_social_accounts" (
    "id" TEXT NOT NULL,
    "platform" VARCHAR(32) NOT NULL,
    "handle" VARCHAR(128) NOT NULL,
    "displayName" VARCHAR(128),
    "credentialsJson" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "connectedByAdminId" TEXT NOT NULL,
    "connectedByEmail" VARCHAR(255) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brand_social_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "brand_social_accounts_platform_handle_key"
    ON "brand_social_accounts"("platform", "handle");
CREATE INDEX IF NOT EXISTS "brand_social_accounts_platform_isActive_idx"
    ON "brand_social_accounts"("platform", "isActive");

CREATE TABLE IF NOT EXISTS "brand_social_posts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" VARCHAR(24) NOT NULL,
    "body" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "providerPostId" TEXT,
    "providerResponse" JSONB,
    "failureMessage" TEXT,
    "aiPrompt" TEXT,
    "aiModel" TEXT,
    "createdByAdminId" TEXT NOT NULL,
    "createdByEmail" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brand_social_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "brand_social_posts_status_scheduledFor_idx"
    ON "brand_social_posts"("status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "brand_social_posts_accountId_createdAt_idx"
    ON "brand_social_posts"("accountId", "createdAt");

ALTER TABLE "brand_social_posts"
    ADD CONSTRAINT "brand_social_posts_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "brand_social_accounts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
