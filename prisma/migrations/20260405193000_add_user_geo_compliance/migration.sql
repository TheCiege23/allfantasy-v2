-- Geo compliance fields on signup (U.S. state restrictions)

ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "detectedStateCode" TEXT;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "isStateRestricted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "stateRestrictionLevel" TEXT;
