-- CreateTable: referral codes (one per user for shareable link)
CREATE TABLE "referral_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: referral events (clicks, signups)
CREATE TABLE "referral_events" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT,
    "type" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: referral rewards (pending / redeemed)
CREATE TABLE "referral_rewards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),

    CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");
CREATE INDEX "referral_codes_userId_idx" ON "referral_codes"("userId");

CREATE INDEX "referral_events_referrerId_idx" ON "referral_events"("referrerId");
CREATE INDEX "referral_events_referredUserId_idx" ON "referral_events"("referredUserId");
CREATE INDEX "referral_events_referrerId_type_idx" ON "referral_events"("referrerId", "type");

CREATE INDEX "referral_rewards_userId_idx" ON "referral_rewards"("userId");
CREATE INDEX "referral_rewards_userId_status_idx" ON "referral_rewards"("userId", "status");

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
