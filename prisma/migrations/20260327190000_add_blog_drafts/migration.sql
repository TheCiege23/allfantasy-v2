-- CreateTable
CREATE TABLE "blog_drafts" (
    "draftId" TEXT NOT NULL,
    "articleId" VARCHAR(64) NOT NULL,
    "title" VARCHAR(512) NOT NULL,
    "slug" VARCHAR(512) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "excerpt" VARCHAR(1024),
    "body" TEXT NOT NULL,
    "seoTitle" VARCHAR(512),
    "seoDescription" VARCHAR(512),
    "tags" JSONB NOT NULL DEFAULT '[]',
    "draftStatus" VARCHAR(24) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_drafts_pkey" PRIMARY KEY ("draftId")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_drafts_articleId_key" ON "blog_drafts"("articleId");

-- CreateIndex
CREATE INDEX "blog_drafts_draftStatus_idx" ON "blog_drafts"("draftStatus");

-- CreateIndex
CREATE INDEX "blog_drafts_sport_idx" ON "blog_drafts"("sport");

-- CreateIndex
CREATE INDEX "blog_drafts_category_idx" ON "blog_drafts"("category");

-- CreateIndex
CREATE INDEX "blog_drafts_updatedAt_idx" ON "blog_drafts"("updatedAt");

-- AddForeignKey
ALTER TABLE "blog_drafts" ADD CONSTRAINT "blog_drafts_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "blog_articles"("articleId") ON DELETE CASCADE ON UPDATE CASCADE;
