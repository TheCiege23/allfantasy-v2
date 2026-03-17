-- CreateTable: Live draft engine (DraftSession, DraftPick, DraftQueue)
CREATE TABLE "draft_sessions" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pre_draft',
    "draftType" TEXT NOT NULL DEFAULT 'snake',
    "rounds" INTEGER NOT NULL DEFAULT 15,
    "teamCount" INTEGER NOT NULL DEFAULT 12,
    "thirdRoundReversal" BOOLEAN NOT NULL DEFAULT false,
    "timerSeconds" INTEGER,
    "timerEndAt" TIMESTAMP(3),
    "pausedRemainingSeconds" INTEGER,
    "slotOrder" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "draft_picks" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "overall" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,
    "rosterId" TEXT NOT NULL,
    "displayName" TEXT,
    "playerName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "team" TEXT,
    "byeWeek" INTEGER,
    "playerId" TEXT,
    "tradedPickMeta" JSONB,
    "source" TEXT DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_picks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "draft_queues" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "order" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_queues_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "draft_sessions_leagueId_key" ON "draft_sessions"("leagueId");
CREATE INDEX "draft_sessions_leagueId_idx" ON "draft_sessions"("leagueId");
CREATE INDEX "draft_sessions_status_idx" ON "draft_sessions"("status");
CREATE UNIQUE INDEX "draft_picks_sessionId_overall_key" ON "draft_picks"("sessionId", "overall");
CREATE INDEX "draft_picks_sessionId_idx" ON "draft_picks"("sessionId");
CREATE INDEX "draft_picks_sessionId_rosterId_idx" ON "draft_picks"("sessionId", "rosterId");
CREATE UNIQUE INDEX "draft_queues_sessionId_userId_key" ON "draft_queues"("sessionId", "userId");
CREATE INDEX "draft_queues_sessionId_idx" ON "draft_queues"("sessionId");

ALTER TABLE "draft_sessions" ADD CONSTRAINT "draft_sessions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "draft_picks" ADD CONSTRAINT "draft_picks_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "draft_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "draft_queues" ADD CONSTRAINT "draft_queues_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "draft_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
