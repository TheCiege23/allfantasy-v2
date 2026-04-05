-- Chimmy AutoCoach™ — per-user settings, swap audit, league + profile toggles

ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "autoCoachEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "autoCoachGlobalEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "auto_coach_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "blockedByCommissioner" BOOLEAN NOT NULL DEFAULT false,
    "lastRunAt" TIMESTAMP(3),
    "lastSwapAt" TIMESTAMP(3),
    "totalSwapsMade" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_coach_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "auto_coach_swap_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "slotPosition" TEXT NOT NULL,
    "playerOutId" TEXT NOT NULL,
    "playerOutName" TEXT NOT NULL,
    "playerOutStatus" TEXT NOT NULL,
    "playerInId" TEXT NOT NULL,
    "playerInName" TEXT NOT NULL,
    "playerInPosition" TEXT NOT NULL,
    "statusSource" TEXT NOT NULL,
    "statusDetectedAt" TIMESTAMP(3) NOT NULL,
    "swapMadeAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gameStartsAt" TIMESTAMP(3),
    "wasPreGame" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_coach_swap_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "auto_coach_settings_userId_leagueId_key" ON "auto_coach_settings"("userId", "leagueId");
CREATE INDEX IF NOT EXISTS "auto_coach_settings_userId_idx" ON "auto_coach_settings"("userId");
CREATE INDEX IF NOT EXISTS "auto_coach_settings_leagueId_idx" ON "auto_coach_settings"("leagueId");

CREATE INDEX IF NOT EXISTS "auto_coach_swap_logs_userId_leagueId_idx" ON "auto_coach_swap_logs"("userId", "leagueId");
CREATE INDEX IF NOT EXISTS "auto_coach_swap_logs_leagueId_idx" ON "auto_coach_swap_logs"("leagueId");
CREATE INDEX IF NOT EXISTS "auto_coach_swap_logs_swapMadeAt_idx" ON "auto_coach_swap_logs"("swapMadeAt");

DO $$
BEGIN
  ALTER TABLE "auto_coach_settings" ADD CONSTRAINT "auto_coach_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "auto_coach_settings" ADD CONSTRAINT "auto_coach_settings_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
