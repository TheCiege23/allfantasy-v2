-- AlterTable: add unique constraint to stripeCheckoutSessionId on user_subscriptions
-- Nullable unique is safe in Postgres: multiple NULL rows are permitted; only non-null values are deduplicated.
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_stripeCheckoutSessionId_key" UNIQUE ("stripeCheckoutSessionId");
