-- CreateTable
CREATE TABLE "blog_articles" (
    "articleId" TEXT NOT NULL,
    "title" VARCHAR(512) NOT NULL,
    "slug" VARCHAR(512) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "excerpt" VARCHAR(1024),
    "body" TEXT NOT NULL,
    "seoTitle" VARCHAR(512),
    "seoDescription" VARCHAR(512),
    "tags" JSONB NOT NULL DEFAULT '[]',
    "publishStatus" VARCHAR(24) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_articles_pkey" PRIMARY KEY ("articleId")
);

-- CreateTable
CREATE TABLE "blog_publish_logs" (
    "publishId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "actionType" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_publish_logs_pkey" PRIMARY KEY ("publishId")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_articles_slug_key" ON "blog_articles"("slug");

-- CreateIndex
CREATE INDEX "blog_articles_publishStatus_idx" ON "blog_articles"("publishStatus");

-- CreateIndex
CREATE INDEX "blog_articles_sport_idx" ON "blog_articles"("sport");

-- CreateIndex
CREATE INDEX "blog_articles_category_idx" ON "blog_articles"("category");

-- CreateIndex
CREATE INDEX "blog_articles_publishedAt_idx" ON "blog_articles"("publishedAt");

-- CreateIndex
CREATE INDEX "blog_articles_createdAt_idx" ON "blog_articles"("createdAt");

-- CreateIndex
CREATE INDEX "blog_publish_logs_articleId_idx" ON "blog_publish_logs"("articleId");

-- CreateIndex
CREATE INDEX "blog_publish_logs_createdAt_idx" ON "blog_publish_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "blog_publish_logs" ADD CONSTRAINT "blog_publish_logs_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "blog_articles"("articleId") ON DELETE CASCADE ON UPDATE CASCADE;
