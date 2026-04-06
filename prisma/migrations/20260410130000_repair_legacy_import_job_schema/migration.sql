ALTER TABLE "LegacyImportJob"
  ADD COLUMN IF NOT EXISTS "totalSeasons" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "LegacyImportJob"
  ADD COLUMN IF NOT EXISTS "seasonsCompleted" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "LegacyImportJob"
  ADD COLUMN IF NOT EXISTS "currentSeasonLeagues" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "LegacyImportJob"
  ADD COLUMN IF NOT EXISTS "totalLeaguesSaved" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "LegacyImportJob"
  ADD COLUMN IF NOT EXISTS "lastRankTier" TEXT;

ALTER TABLE "LegacyImportJob"
  ADD COLUMN IF NOT EXISTS "lastRankLevel" INTEGER;

ALTER TABLE "LegacyImportJob"
  ADD COLUMN IF NOT EXISTS "lastXpTotal" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "LegacyImportJob"
  ADD COLUMN IF NOT EXISTS "notificationSent" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "LegacyImportJob"
  ADD COLUMN IF NOT EXISTS "seasonsSummary" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "LegacyImportJob"
  ADD COLUMN IF NOT EXISTS "appUserId" TEXT;

CREATE INDEX IF NOT EXISTS "LegacyImportJob_appUserId_status_idx"
  ON "LegacyImportJob"("appUserId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'LegacyImportJob_appUserId_fkey'
  ) THEN
    ALTER TABLE "LegacyImportJob"
      ADD CONSTRAINT "LegacyImportJob_appUserId_fkey"
      FOREIGN KEY ("appUserId") REFERENCES "app_users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "import_job_seasons" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "season" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "leagueCount" INTEGER NOT NULL DEFAULT 0,
  "wins" INTEGER NOT NULL DEFAULT 0,
  "losses" INTEGER NOT NULL DEFAULT 0,
  "championships" INTEGER NOT NULL DEFAULT 0,
  "playoffApps" INTEGER NOT NULL DEFAULT 0,
  "xpEarned" INTEGER NOT NULL DEFAULT 0,
  "rankAfter" TEXT,
  "levelAfter" INTEGER,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "import_job_seasons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "import_job_seasons_jobId_season_key"
  ON "import_job_seasons"("jobId", "season");

CREATE INDEX IF NOT EXISTS "import_job_seasons_jobId_status_idx"
  ON "import_job_seasons"("jobId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'import_job_seasons_jobId_fkey'
  ) THEN
    ALTER TABLE "import_job_seasons"
      ADD CONSTRAINT "import_job_seasons_jobId_fkey"
      FOREIGN KEY ("jobId") REFERENCES "LegacyImportJob"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
