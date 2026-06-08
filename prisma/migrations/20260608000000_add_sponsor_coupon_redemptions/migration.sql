-- Migration: add_sponsor_coupon_redemptions
-- Adds the sponsor_coupon_redemptions table for tracking WassupFred (and future)
-- promotional discount codes. Includes a partial unique index that prevents
-- a user from successfully redeeming the same code twice while still allowing
-- pending/expired/cancelled rows for the same user+code (e.g. abandoned checkouts).

CREATE TABLE "sponsor_coupon_redemptions" (
    "id"                      TEXT NOT NULL,
    "userId"                  TEXT NOT NULL,
    "normalizedCode"          VARCHAR(64) NOT NULL,
    "displayCode"             VARCHAR(64) NOT NULL,
    "sponsorName"             VARCHAR(128) NOT NULL,
    "campaignName"            VARCHAR(128) NOT NULL,
    "discountPercent"         INTEGER NOT NULL,
    "appliesTo"               VARCHAR(32) NOT NULL,
    "productKey"              VARCHAR(128),
    "stripeCheckoutSessionId" VARCHAR(128),
    "stripePaymentIntentId"   VARCHAR(128),
    "stripeInvoiceId"         VARCHAR(128),
    "stripeSubscriptionId"    VARCHAR(128),
    "purchaseRecordId"        VARCHAR(128),
    "status"                  VARCHAR(32) NOT NULL DEFAULT 'pending',
    "amountSubtotalCents"     INTEGER,
    "discountAmountCents"     INTEGER,
    "amountTotalCents"        INTEGER,
    "currency"                VARCHAR(8) NOT NULL DEFAULT 'usd',
    "redeemedAt"              TIMESTAMP(3),
    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsor_coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- Standard indexes
CREATE INDEX "sponsor_coupon_redemptions_userId_normalizedCode_idx"
    ON "sponsor_coupon_redemptions"("userId", "normalizedCode");

CREATE INDEX "sponsor_coupon_redemptions_normalizedCode_idx"
    ON "sponsor_coupon_redemptions"("normalizedCode");

CREATE INDEX "sponsor_coupon_redemptions_stripeCheckoutSessionId_idx"
    ON "sponsor_coupon_redemptions"("stripeCheckoutSessionId");

CREATE INDEX "sponsor_coupon_redemptions_stripeInvoiceId_idx"
    ON "sponsor_coupon_redemptions"("stripeInvoiceId");

CREATE INDEX "sponsor_coupon_redemptions_status_idx"
    ON "sponsor_coupon_redemptions"("status");

CREATE INDEX "sponsor_coupon_redemptions_sponsorName_campaignName_idx"
    ON "sponsor_coupon_redemptions"("sponsorName", "campaignName");

CREATE INDEX "sponsor_coupon_redemptions_createdAt_idx"
    ON "sponsor_coupon_redemptions"("createdAt");

-- Partial unique index: only one REDEEMED row per user+code.
-- Pending/expired/cancelled rows are allowed to accumulate (abandoned checkouts).
-- NOTE: Prisma cannot express partial unique indexes natively; this raw SQL
-- migration is the source of truth for this constraint.
CREATE UNIQUE INDEX "sponsor_coupon_redemptions_redeemed_user_code_uniq"
    ON "sponsor_coupon_redemptions"("userId", "normalizedCode")
    WHERE "status" = 'redeemed';

-- Foreign key to app_users
ALTER TABLE "sponsor_coupon_redemptions"
    ADD CONSTRAINT "sponsor_coupon_redemptions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "app_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
