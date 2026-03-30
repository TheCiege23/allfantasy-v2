-- PROMPT 252: Subscription entitlement system foundation.
-- Adds subscription plan catalog and per-user subscription lifecycle table.

CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "isBundle" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_code_key"
ON "subscription_plans"("code");

CREATE INDEX IF NOT EXISTS "subscription_plans_isActive_idx"
ON "subscription_plans"("isActive");

CREATE TABLE IF NOT EXISTS "user_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionPlanId" TEXT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "source" VARCHAR(32) NOT NULL DEFAULT 'stripe',
    "sku" VARCHAR(64),
    "stripeCustomerId" VARCHAR(128),
    "stripeSubscriptionId" VARCHAR(128),
    "stripeCheckoutSessionId" VARCHAR(128),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "gracePeriodEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_subscriptions_stripeSubscriptionId_key"
ON "user_subscriptions"("stripeSubscriptionId");

CREATE INDEX IF NOT EXISTS "user_subscriptions_userId_idx"
ON "user_subscriptions"("userId");

CREATE INDEX IF NOT EXISTS "user_subscriptions_userId_status_idx"
ON "user_subscriptions"("userId", "status");

CREATE INDEX IF NOT EXISTS "user_subscriptions_subscriptionPlanId_status_idx"
ON "user_subscriptions"("subscriptionPlanId", "status");

CREATE INDEX IF NOT EXISTS "user_subscriptions_currentPeriodEnd_idx"
ON "user_subscriptions"("currentPeriodEnd");

CREATE INDEX IF NOT EXISTS "user_subscriptions_gracePeriodEnd_idx"
ON "user_subscriptions"("gracePeriodEnd");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'user_subscriptions_userId_fkey'
      AND table_name = 'user_subscriptions'
  ) THEN
    ALTER TABLE "user_subscriptions"
      ADD CONSTRAINT "user_subscriptions_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "app_users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'user_subscriptions_subscriptionPlanId_fkey'
      AND table_name = 'user_subscriptions'
  ) THEN
    ALTER TABLE "user_subscriptions"
      ADD CONSTRAINT "user_subscriptions_subscriptionPlanId_fkey"
      FOREIGN KEY ("subscriptionPlanId") REFERENCES "subscription_plans"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "subscription_plans" ("id", "code", "name", "description", "isBundle", "isActive", "createdAt", "updatedAt")
VALUES
  ('3b2bf5be-c236-4d58-8b8a-6dce3698d001', 'af_pro', 'AF Pro', 'Player-specific AI features for active fantasy managers.', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('3b2bf5be-c236-4d58-8b8a-6dce3698d002', 'af_commissioner', 'AF Commissioner', 'League-specific commissioner tools and automation controls.', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('3b2bf5be-c236-4d58-8b8a-6dce3698d003', 'af_war_room', 'AF War Room', 'Draft strategy and long-term planning tools for one user.', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('3b2bf5be-c236-4d58-8b8a-6dce3698d004', 'af_all_access', 'AF All-Access Bundle', 'AF Pro + AF Commissioner + AF War Room.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "isBundle" = EXCLUDED."isBundle",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;
