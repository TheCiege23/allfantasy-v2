-- Cadence config for the /api/cron/blog-autogen job.

CREATE TABLE IF NOT EXISTS "automated_blog_schedules" (
    "id" TEXT NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "topicHint" TEXT,
    "cadenceDays" INTEGER NOT NULL DEFAULT 7,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoPublish" BOOLEAN NOT NULL DEFAULT false,
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" VARCHAR(16),
    "lastRunArticleId" TEXT,
    "lastRunError" TEXT,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdByAdminId" TEXT NOT NULL,
    "createdByEmail" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "automated_blog_schedules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "automated_blog_schedules_sport_category_key"
    ON "automated_blog_schedules"("sport", "category");
CREATE INDEX IF NOT EXISTS "automated_blog_schedules_isActive_lastRunAt_idx"
    ON "automated_blog_schedules"("isActive", "lastRunAt");
