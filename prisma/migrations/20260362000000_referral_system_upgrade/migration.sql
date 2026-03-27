ALTER TABLE "referral_codes"
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "metadata" JSONB,
ADD COLUMN IF NOT EXISTS "shareCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "successfulReferralCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastSharedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DROP INDEX IF EXISTS "referral_events_referredUserId_key";

ALTER TABLE "referral_events"
ADD COLUMN IF NOT EXISTS "referralId" TEXT,
ADD COLUMN IF NOT EXISTS "codeId" TEXT,
ADD COLUMN IF NOT EXISTS "channel" TEXT,
ADD COLUMN IF NOT EXISTS "onboardingStep" TEXT;

ALTER TABLE "referral_rewards"
ADD COLUMN IF NOT EXISTS "referralId" TEXT,
ADD COLUMN IF NOT EXISTS "rewardRuleId" TEXT,
ADD COLUMN IF NOT EXISTS "rewardKind" TEXT NOT NULL DEFAULT 'xp',
ADD COLUMN IF NOT EXISTS "label" TEXT,
ADD COLUMN IF NOT EXISTS "value" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "referrals" (
  "id" TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "referredUserId" TEXT,
  "referralCodeId" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'user',
  "status" TEXT NOT NULL DEFAULT 'clicked',
  "onboardingStep" TEXT,
  "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "signupCompletedAt" TIMESTAMP(3),
  "onboardingStartedAt" TIMESTAMP(3),
  "onboardingCompletedAt" TIMESTAMP(3),
  "rewardGrantedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "referral_reward_rules" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "triggerType" TEXT NOT NULL,
  "audience" TEXT NOT NULL DEFAULT 'all',
  "rewardKind" TEXT NOT NULL DEFAULT 'xp',
  "value" INTEGER NOT NULL DEFAULT 0,
  "badgeType" TEXT,
  "badgeName" TEXT,
  "badgeDescription" TEXT,
  "badgeTier" TEXT,
  "maxAwardsPerUser" INTEGER NOT NULL DEFAULT 0,
  "minSuccessfulReferrals" INTEGER NOT NULL DEFAULT 0,
  "isClaimable" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "config" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referral_reward_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "referrals_referredUserId_key"
ON "referrals"("referredUserId");

CREATE UNIQUE INDEX IF NOT EXISTS "referral_reward_rules_key_key"
ON "referral_reward_rules"("key");

CREATE INDEX IF NOT EXISTS "referral_codes_userId_status_idx"
ON "referral_codes"("userId", "status");

CREATE INDEX IF NOT EXISTS "referrals_referrerId_idx"
ON "referrals"("referrerId");

CREATE INDEX IF NOT EXISTS "referrals_referrerId_kind_status_idx"
ON "referrals"("referrerId", "kind", "status");

CREATE INDEX IF NOT EXISTS "referrals_referralCodeId_idx"
ON "referrals"("referralCodeId");

CREATE INDEX IF NOT EXISTS "referrals_signupCompletedAt_idx"
ON "referrals"("signupCompletedAt");

CREATE INDEX IF NOT EXISTS "referrals_onboardingCompletedAt_idx"
ON "referrals"("onboardingCompletedAt");

CREATE INDEX IF NOT EXISTS "referral_events_referredUserId_idx"
ON "referral_events"("referredUserId");

CREATE INDEX IF NOT EXISTS "referral_events_referralId_type_createdAt_idx"
ON "referral_events"("referralId", "type", "createdAt");

CREATE INDEX IF NOT EXISTS "referral_events_codeId_type_createdAt_idx"
ON "referral_events"("codeId", "type", "createdAt");

CREATE INDEX IF NOT EXISTS "referral_events_channel_createdAt_idx"
ON "referral_events"("channel", "createdAt");

CREATE INDEX IF NOT EXISTS "referral_reward_rules_triggerType_isActive_idx"
ON "referral_reward_rules"("triggerType", "isActive");

CREATE INDEX IF NOT EXISTS "referral_reward_rules_audience_isActive_idx"
ON "referral_reward_rules"("audience", "isActive");

CREATE INDEX IF NOT EXISTS "referral_rewards_referralId_idx"
ON "referral_rewards"("referralId");

CREATE INDEX IF NOT EXISTS "referral_rewards_rewardRuleId_idx"
ON "referral_rewards"("rewardRuleId");

CREATE INDEX IF NOT EXISTS "referral_rewards_type_status_idx"
ON "referral_rewards"("type", "status");

INSERT INTO "referrals" (
  "id",
  "referrerId",
  "referredUserId",
  "kind",
  "status",
  "clickedAt",
  "signupCompletedAt",
  "metadata",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "referrerId",
  "referredUserId",
  'user',
  'signed_up',
  "createdAt",
  "createdAt",
  "metadata",
  "createdAt",
  CURRENT_TIMESTAMP
FROM "referral_events"
WHERE "type" = 'signup'
  AND "referredUserId" IS NOT NULL
ON CONFLICT ("referredUserId") DO NOTHING;

UPDATE "referral_events" AS event
SET "referralId" = referral."id"
FROM "referrals" AS referral
WHERE event."type" = 'signup'
  AND event."referredUserId" = referral."referredUserId"
  AND event."referralId" IS NULL;

UPDATE "referral_rewards"
SET "rewardKind" = CASE
    WHEN "type" LIKE '%badge%' THEN 'badge'
    ELSE 'xp'
  END,
  "label" = COALESCE("label", CASE
    WHEN "type" = 'referral_signup' THEN 'Referral XP'
    WHEN "type" = 'referral_join' THEN 'Referral Join Reward'
    ELSE INITCAP(REPLACE("type", '_', ' '))
  END),
  "value" = CASE
    WHEN "value" <> 0 THEN "value"
    WHEN "type" = 'referral_signup' THEN 50
    ELSE 0
  END;

ALTER TABLE "referrals"
ADD CONSTRAINT "referrals_referrerId_fkey"
FOREIGN KEY ("referrerId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "referrals"
ADD CONSTRAINT "referrals_referredUserId_fkey"
FOREIGN KEY ("referredUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "referrals"
ADD CONSTRAINT "referrals_referralCodeId_fkey"
FOREIGN KEY ("referralCodeId") REFERENCES "referral_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "referral_events"
ADD CONSTRAINT "referral_events_referralId_fkey"
FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "referral_events"
ADD CONSTRAINT "referral_events_codeId_fkey"
FOREIGN KEY ("codeId") REFERENCES "referral_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "referral_rewards"
ADD CONSTRAINT "referral_rewards_referralId_fkey"
FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "referral_rewards"
ADD CONSTRAINT "referral_rewards_rewardRuleId_fkey"
FOREIGN KEY ("rewardRuleId") REFERENCES "referral_reward_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
