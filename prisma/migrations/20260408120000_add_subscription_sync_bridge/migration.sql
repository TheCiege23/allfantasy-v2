-- Sync bridge: denormalized plan flags on user_profiles + index for Stripe customer lookup.
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "afProSub" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "afWarRoomSub" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "user_subscriptions_stripeCustomerId_idx"
ON "user_subscriptions"("stripeCustomerId");
