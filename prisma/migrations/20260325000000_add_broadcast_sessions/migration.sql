-- CreateTable
CREATE TABLE "broadcast_sessions" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(128),

    CONSTRAINT "broadcast_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "broadcast_sessions_leagueId_idx" ON "broadcast_sessions"("leagueId");

-- CreateIndex
CREATE INDEX "broadcast_sessions_startedAt_idx" ON "broadcast_sessions"("startedAt");
