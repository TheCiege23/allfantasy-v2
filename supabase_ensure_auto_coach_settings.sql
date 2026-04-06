-- Ensures `auto_coach_settings` exists (matches prisma `AutoCoachSetting` / @@map("auto_coach_settings")).
-- Run in Supabase SQL editor if the table is missing and `/api/user/autocoach` returns 500.

CREATE TABLE IF NOT EXISTS "auto_coach_settings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "blockedByCommissioner" BOOLEAN NOT NULL DEFAULT false,
  "lastRunAt" TIMESTAMPTZ,
  "lastSwapAt" TIMESTAMPTZ,
  "totalSwapsMade" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "auto_coach_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "auto_coach_settings_userId_leagueId_key" UNIQUE ("userId", "leagueId")
);

CREATE INDEX IF NOT EXISTS "auto_coach_settings_userId_idx" ON "auto_coach_settings" ("userId");
CREATE INDEX IF NOT EXISTS "auto_coach_settings_leagueId_idx" ON "auto_coach_settings" ("leagueId");
