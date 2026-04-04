-- Expand ZombieRulesTemplate + rules docs + audit + free rewards + announcement queue

ALTER TABLE "zombie_rules_templates" ADD COLUMN IF NOT EXISTS "rosterSize" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "zombie_rules_templates" ADD COLUMN IF NOT EXISTS "starterCount" INTEGER NOT NULL DEFAULT 9;
ALTER TABLE "zombie_rules_templates" ADD COLUMN IF NOT EXISTS "benchCount" INTEGER NOT NULL DEFAULT 6;
ALTER TABLE "zombie_rules_templates" ADD COLUMN IF NOT EXISTS "irSlotsDefault" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "zombie_rules_templates" ADD COLUMN IF NOT EXISTS "lineupFrequency" TEXT NOT NULL DEFAULT 'weekly';
ALTER TABLE "zombie_rules_templates" ADD COLUMN IF NOT EXISTS "scoringPeriod" TEXT NOT NULL DEFAULT 'weekly';
ALTER TABLE "zombie_rules_templates" ADD COLUMN IF NOT EXISTS "scoringWindowDesc" TEXT NOT NULL DEFAULT '';
ALTER TABLE "zombie_rules_templates" ADD COLUMN IF NOT EXISTS "serumAwardCondition" TEXT NOT NULL DEFAULT '';
ALTER TABLE "zombie_rules_templates" ADD COLUMN IF NOT EXISTS "serumAwardDesc" TEXT NOT NULL DEFAULT '';
ALTER TABLE "zombie_rules_templates" ADD COLUMN IF NOT EXISTS "edgeCaseNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "zombie_rules_templates" ADD COLUMN IF NOT EXISTS "positionList" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "zombie_announcements" ADD COLUMN IF NOT EXISTS "scheduledFor" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "zombie_announcements_isPosted_scheduledFor_idx" ON "zombie_announcements"("isPosted", "scheduledFor");

CREATE TABLE IF NOT EXISTS "zombie_rules_documents" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "sectionOverview" TEXT NOT NULL DEFAULT '',
    "sectionInfection" TEXT NOT NULL DEFAULT '',
    "sectionWhisperer" TEXT NOT NULL DEFAULT '',
    "sectionSurvivor" TEXT NOT NULL DEFAULT '',
    "sectionZombie" TEXT NOT NULL DEFAULT '',
    "sectionScoring" TEXT NOT NULL DEFAULT '',
    "sectionRoster" TEXT NOT NULL DEFAULT '',
    "sectionAmbush" TEXT NOT NULL DEFAULT '',
    "sectionBashing" TEXT NOT NULL DEFAULT '',
    "sectionMauling" TEXT NOT NULL DEFAULT '',
    "sectionSerums" TEXT NOT NULL DEFAULT '',
    "sectionWeapons" TEXT NOT NULL DEFAULT '',
    "sectionWinnings" TEXT NOT NULL DEFAULT '',
    "sectionUniverseMovement" TEXT NOT NULL DEFAULT '',
    "sectionWeeklyTiming" TEXT NOT NULL DEFAULT '',
    "sectionChimmy" TEXT NOT NULL DEFAULT '',
    "sectionPaidVsFree" TEXT NOT NULL DEFAULT '',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_rules_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "zombie_rules_documents_leagueId_version_key" ON "zombie_rules_documents"("leagueId", "version");
CREATE INDEX IF NOT EXISTS "zombie_rules_documents_leagueId_idx" ON "zombie_rules_documents"("leagueId");

DO $$ BEGIN
 ALTER TABLE "zombie_rules_documents" ADD CONSTRAINT "zombie_rules_documents_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "zombie_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "zombie_audit_entries" (
    "id" TEXT NOT NULL,
    "zombieLeagueId" TEXT NOT NULL,
    "universeId" TEXT,
    "week" INTEGER,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "targetUserId" TEXT,
    "targetStatus" TEXT,
    "previousState" JSONB,
    "newState" JSONB,
    "amount" DOUBLE PRECISION,
    "description" TEXT NOT NULL,
    "isVisibleToCommissioner" BOOLEAN NOT NULL DEFAULT true,
    "isVisibleToAffectedUser" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isRevealablePostSeason" BOOLEAN NOT NULL DEFAULT true,
    "cannotBeOverridden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_audit_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "zombie_audit_entries_zombieLeagueId_category_idx" ON "zombie_audit_entries"("zombieLeagueId", "category");
CREATE INDEX IF NOT EXISTS "zombie_audit_entries_zombieLeagueId_week_idx" ON "zombie_audit_entries"("zombieLeagueId", "week");
CREATE INDEX IF NOT EXISTS "zombie_audit_entries_actorUserId_idx" ON "zombie_audit_entries"("actorUserId");

DO $$ BEGIN
 ALTER TABLE "zombie_audit_entries" ADD CONSTRAINT "zombie_audit_entries_zombieLeagueId_fkey" FOREIGN KEY ("zombieLeagueId") REFERENCES "zombie_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "zombie_free_reward_configs" (
    "id" TEXT NOT NULL,
    "zombieLeagueId" TEXT NOT NULL,
    "currencyLabel" TEXT NOT NULL DEFAULT 'Outbreak Points',
    "weeklyWinLabel" TEXT NOT NULL DEFAULT 'Weekly Horde Haul',
    "seasonWinLabel" TEXT NOT NULL DEFAULT 'Sole Survivor Award',
    "ultimatePotLabel" TEXT NOT NULL DEFAULT 'Last Alive Bonus',
    "badgesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "achievementsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "symbolicPotTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "symbolicWeeklyPool" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_free_reward_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "zombie_free_reward_configs_zombieLeagueId_key" ON "zombie_free_reward_configs"("zombieLeagueId");

DO $$ BEGIN
 ALTER TABLE "zombie_free_reward_configs" ADD CONSTRAINT "zombie_free_reward_configs_zombieLeagueId_fkey" FOREIGN KEY ("zombieLeagueId") REFERENCES "zombie_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
