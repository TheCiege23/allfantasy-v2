-- Mini-commissioner assignments and league settings approval queue (LegacyTournament hubs)

CREATE TABLE "tournament_mini_commissioners" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_mini_commissioners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tournament_league_setting_requests" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "proposedPatch" JSONB NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolverId" TEXT,

    CONSTRAINT "tournament_league_setting_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tournament_mini_commissioners_tournamentId_leagueId_key" ON "tournament_mini_commissioners"("tournamentId", "leagueId");

CREATE INDEX "tournament_mini_commissioners_userId_idx" ON "tournament_mini_commissioners"("userId");

CREATE INDEX "tournament_mini_commissioners_tournamentId_idx" ON "tournament_mini_commissioners"("tournamentId");

CREATE INDEX "tournament_league_setting_requests_tournamentId_status_idx" ON "tournament_league_setting_requests"("tournamentId", "status");

CREATE INDEX "tournament_league_setting_requests_requesterId_idx" ON "tournament_league_setting_requests"("requesterId");

ALTER TABLE "tournament_mini_commissioners" ADD CONSTRAINT "tournament_mini_commissioners_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tournament_mini_commissioners" ADD CONSTRAINT "tournament_mini_commissioners_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tournament_mini_commissioners" ADD CONSTRAINT "tournament_mini_commissioners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tournament_league_setting_requests" ADD CONSTRAINT "tournament_league_setting_requests_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tournament_league_setting_requests" ADD CONSTRAINT "tournament_league_setting_requests_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tournament_league_setting_requests" ADD CONSTRAINT "tournament_league_setting_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tournament_league_setting_requests" ADD CONSTRAINT "tournament_league_setting_requests_resolverId_fkey" FOREIGN KEY ("resolverId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
