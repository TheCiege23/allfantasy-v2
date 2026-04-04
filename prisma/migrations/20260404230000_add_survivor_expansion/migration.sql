-- Survivor expansion: power/challenge/arc templates, power balance, twist log, universal audit, league token fields.

ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorTokenCap" INTEGER;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorExileHarshTokenLoss" BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS "survivor_power_templates" (
    "id" TEXT NOT NULL,
    "powerType" TEXT NOT NULL,
    "powerLabel" TEXT NOT NULL,
    "powerCategory" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "exactBehavior" TEXT NOT NULL,
    "useWindow" TEXT NOT NULL,
    "phaseValidity" TEXT NOT NULL DEFAULT 'both',
    "targetType" TEXT NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT true,
    "expirationRule" TEXT NOT NULL,
    "isTradable" BOOLEAN NOT NULL DEFAULT false,
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "recommendedFreq" TEXT NOT NULL,
    "maxPerSeason" INTEGER NOT NULL DEFAULT 1,
    "maxPerPlayer" INTEGER NOT NULL DEFAULT 1,
    "maxConcurrentLeague" INTEGER NOT NULL DEFAULT 3,
    "abusePreventionRules" TEXT NOT NULL,
    "revealBehavior" TEXT NOT NULL,
    "aiValidationRequired" TEXT NOT NULL,
    "auditRequirements" TEXT NOT NULL,
    "isDraftDefault" BOOLEAN NOT NULL DEFAULT false,
    "isAdvanced" BOOLEAN NOT NULL DEFAULT false,
    "isDisadvantage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_power_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "survivor_power_templates_powerType_key" ON "survivor_power_templates"("powerType");
CREATE INDEX IF NOT EXISTS "survivor_power_templates_powerCategory_idx" ON "survivor_power_templates"("powerCategory");

CREATE TABLE IF NOT EXISTS "survivor_season_arc_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "playerCount" INTEGER NOT NULL,
    "tribeCount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "arcSteps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_season_arc_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "survivor_season_arc_templates_name_key" ON "survivor_season_arc_templates"("name");

CREATE TABLE IF NOT EXISTS "survivor_challenge_templates" (
    "id" TEXT NOT NULL,
    "challengeKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'tribe',
    "inputDescription" TEXT NOT NULL,
    "submissionChannel" TEXT NOT NULL DEFAULT 'tribe_chat',
    "deadlineBehavior" TEXT NOT NULL DEFAULT '',
    "tiebreakerRule" TEXT NOT NULL DEFAULT '',
    "defaultRewardType" TEXT NOT NULL DEFAULT '',
    "defaultPenaltyType" TEXT,
    "affectsImmunity" BOOLEAN NOT NULL DEFAULT false,
    "affectsFaab" BOOLEAN NOT NULL DEFAULT false,
    "grantsIdol" BOOLEAN NOT NULL DEFAULT false,
    "grantsDisadvantage" BOOLEAN NOT NULL DEFAULT false,
    "aiCanAutoGenerate" BOOLEAN NOT NULL DEFAULT true,
    "commissionerApprovalRecommended" BOOLEAN NOT NULL DEFAULT false,
    "phaseValidity" TEXT NOT NULL DEFAULT 'pre_merge',
    "sportAdaptation" JSONB,
    "notes" TEXT,
    "extraMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_challenge_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "survivor_challenge_templates_challengeKey_key" ON "survivor_challenge_templates"("challengeKey");
CREATE INDEX IF NOT EXISTS "survivor_challenge_templates_category_phaseValidity_idx" ON "survivor_challenge_templates"("category", "phaseValidity");

CREATE TABLE IF NOT EXISTS "survivor_power_balances" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "activePowerCount" INTEGER NOT NULL DEFAULT 0,
    "immunityPowerCount" INTEGER NOT NULL DEFAULT 0,
    "voteControlCount" INTEGER NOT NULL DEFAULT 0,
    "scorePowerCount" INTEGER NOT NULL DEFAULT 0,
    "tribeControlCount" INTEGER NOT NULL DEFAULT 0,
    "infoPowerCount" INTEGER NOT NULL DEFAULT 0,
    "powersByPlayer" JSONB NOT NULL DEFAULT '{}',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_power_balances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "survivor_power_balances_leagueId_key" ON "survivor_power_balances"("leagueId");
CREATE INDEX IF NOT EXISTS "survivor_power_balances_leagueId_idx" ON "survivor_power_balances"("leagueId");

ALTER TABLE "survivor_power_balances" DROP CONSTRAINT IF EXISTS "survivor_power_balances_leagueId_fkey";
ALTER TABLE "survivor_power_balances" ADD CONSTRAINT "survivor_power_balances_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "survivor_twist_events" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "twistType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affectedPlayerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "affectedTribeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "wasAutoTriggered" BOOLEAN NOT NULL DEFAULT true,
    "commissionerNote" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_twist_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "survivor_twist_events_leagueId_week_idx" ON "survivor_twist_events"("leagueId", "week");

ALTER TABLE "survivor_twist_events" DROP CONSTRAINT IF EXISTS "survivor_twist_events_leagueId_fkey";
ALTER TABLE "survivor_twist_events" ADD CONSTRAINT "survivor_twist_events_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "survivor_audit_entries" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "week" INTEGER,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "targetUserId" TEXT,
    "targetTribeId" TEXT,
    "relatedEntityId" TEXT,
    "relatedEntityType" TEXT,
    "data" JSONB NOT NULL,
    "isVisibleToCommissioner" BOOLEAN NOT NULL DEFAULT true,
    "isVisibleToPublic" BOOLEAN NOT NULL DEFAULT false,
    "isRevealablePostSeason" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_audit_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "survivor_audit_entries_leagueId_category_idx" ON "survivor_audit_entries"("leagueId", "category");
CREATE INDEX IF NOT EXISTS "survivor_audit_entries_leagueId_week_idx" ON "survivor_audit_entries"("leagueId", "week");

ALTER TABLE "survivor_audit_entries" DROP CONSTRAINT IF EXISTS "survivor_audit_entries_leagueId_fkey";
ALTER TABLE "survivor_audit_entries" ADD CONSTRAINT "survivor_audit_entries_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
