CREATE TABLE "draft_intro_views" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "draftSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "draftTypeKey" TEXT,
    "videoUrl" TEXT,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_intro_views_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "draft_intro_views_draftSessionId_userId_key" ON "draft_intro_views"("draftSessionId", "userId");
CREATE INDEX "draft_intro_views_leagueId_idx" ON "draft_intro_views"("leagueId");
CREATE INDEX "draft_intro_views_userId_idx" ON "draft_intro_views"("userId");
CREATE INDEX "draft_intro_views_draftTypeKey_idx" ON "draft_intro_views"("draftTypeKey");

ALTER TABLE "draft_intro_views" ADD CONSTRAINT "draft_intro_views_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "draft_intro_views" ADD CONSTRAINT "draft_intro_views_draftSessionId_fkey" FOREIGN KEY ("draftSessionId") REFERENCES "draft_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "draft_intro_views" ADD CONSTRAINT "draft_intro_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
