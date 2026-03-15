-- CreateTable
CREATE TABLE "media_articles" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "headline" VARCHAR(256) NOT NULL,
    "body" TEXT NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_articles_leagueId_idx" ON "media_articles"("leagueId");

-- CreateIndex
CREATE INDEX "media_articles_leagueId_sport_idx" ON "media_articles"("leagueId", "sport");

-- CreateIndex
CREATE INDEX "media_articles_createdAt_idx" ON "media_articles"("createdAt");
