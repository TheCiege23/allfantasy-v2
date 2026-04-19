-- Admin-issued subscription grants (comps, trials, support credits).
-- Entitlement resolver unions these with webhook-driven userSubscription rows; grants
-- count as active when expiresAt > now and revokedAt IS NULL.

CREATE TABLE IF NOT EXISTS "admin_subscription_grants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" VARCHAR(32) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "grantedByAdminId" TEXT NOT NULL,
    "grantedByEmail" VARCHAR(255) NOT NULL,
    "reason" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "revokedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_subscription_grants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "admin_subscription_grants_userId_expiresAt_idx"
    ON "admin_subscription_grants"("userId", "expiresAt");
CREATE INDEX IF NOT EXISTS "admin_subscription_grants_tier_expiresAt_idx"
    ON "admin_subscription_grants"("tier", "expiresAt");
CREATE INDEX IF NOT EXISTS "admin_subscription_grants_revokedAt_idx"
    ON "admin_subscription_grants"("revokedAt");

ALTER TABLE "admin_subscription_grants"
    ADD CONSTRAINT "admin_subscription_grants_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "app_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
