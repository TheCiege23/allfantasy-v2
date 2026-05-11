-- Reusable NBA/NHL playoff bracket challenge foundation.
CREATE TABLE "playoff_bracket_challenges" (
  "id" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sport" TEXT NOT NULL,
  "seasonYear" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "isTestMode" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "playoff_bracket_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "playoff_bracket_entries" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "playoff_bracket_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "playoff_bracket_series" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "round" TEXT NOT NULL,
  "roundIndex" INTEGER NOT NULL,
  "seriesNumber" INTEGER NOT NULL,
  "conference" TEXT NOT NULL,
  "homeSeed" INTEGER NOT NULL,
  "awaySeed" INTEGER NOT NULL,
  "homeTeamName" TEXT NOT NULL,
  "awayTeamName" TEXT NOT NULL,
  "winnerTeamName" TEXT,
  "bestOf" INTEGER NOT NULL DEFAULT 7,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "startsAt" TIMESTAMP(3),
  "nextSeriesNumber" INTEGER,
  "nextSeriesSlot" TEXT,
  "sourceSeriesHome" INTEGER,
  "sourceSeriesAway" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "playoff_bracket_series_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "playoff_bracket_picks" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "seriesId" TEXT NOT NULL,
  "pickTeamName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "playoff_bracket_picks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "playoff_bracket_challenges_ownerUserId_idx" ON "playoff_bracket_challenges"("ownerUserId");
CREATE INDEX "playoff_bracket_challenges_sport_seasonYear_idx" ON "playoff_bracket_challenges"("sport", "seasonYear");
CREATE INDEX "playoff_bracket_challenges_status_idx" ON "playoff_bracket_challenges"("status");

CREATE INDEX "playoff_bracket_entries_challengeId_idx" ON "playoff_bracket_entries"("challengeId");
CREATE INDEX "playoff_bracket_entries_userId_idx" ON "playoff_bracket_entries"("userId");
CREATE INDEX "playoff_bracket_entries_challengeId_userId_idx" ON "playoff_bracket_entries"("challengeId", "userId");

CREATE UNIQUE INDEX "playoff_bracket_series_challengeId_seriesNumber_key" ON "playoff_bracket_series"("challengeId", "seriesNumber");
CREATE INDEX "playoff_bracket_series_challengeId_idx" ON "playoff_bracket_series"("challengeId");
CREATE INDEX "playoff_bracket_series_round_idx" ON "playoff_bracket_series"("round");
CREATE INDEX "playoff_bracket_series_status_idx" ON "playoff_bracket_series"("status");

CREATE UNIQUE INDEX "playoff_bracket_picks_entryId_seriesId_key" ON "playoff_bracket_picks"("entryId", "seriesId");
CREATE INDEX "playoff_bracket_picks_challengeId_idx" ON "playoff_bracket_picks"("challengeId");
CREATE INDEX "playoff_bracket_picks_entryId_idx" ON "playoff_bracket_picks"("entryId");
CREATE INDEX "playoff_bracket_picks_seriesId_idx" ON "playoff_bracket_picks"("seriesId");

ALTER TABLE "playoff_bracket_challenges"
  ADD CONSTRAINT "playoff_bracket_challenges_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "playoff_bracket_entries"
  ADD CONSTRAINT "playoff_bracket_entries_challengeId_fkey"
  FOREIGN KEY ("challengeId") REFERENCES "playoff_bracket_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "playoff_bracket_entries"
  ADD CONSTRAINT "playoff_bracket_entries_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "playoff_bracket_series"
  ADD CONSTRAINT "playoff_bracket_series_challengeId_fkey"
  FOREIGN KEY ("challengeId") REFERENCES "playoff_bracket_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "playoff_bracket_picks"
  ADD CONSTRAINT "playoff_bracket_picks_challengeId_fkey"
  FOREIGN KEY ("challengeId") REFERENCES "playoff_bracket_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "playoff_bracket_picks"
  ADD CONSTRAINT "playoff_bracket_picks_entryId_fkey"
  FOREIGN KEY ("entryId") REFERENCES "playoff_bracket_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "playoff_bracket_picks"
  ADD CONSTRAINT "playoff_bracket_picks_seriesId_fkey"
  FOREIGN KEY ("seriesId") REFERENCES "playoff_bracket_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
