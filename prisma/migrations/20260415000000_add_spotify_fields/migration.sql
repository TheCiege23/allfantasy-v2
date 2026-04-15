-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "spotifyAccessToken" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "spotifyRefreshToken" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "spotifyExpiresAt" TIMESTAMP(3);
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "spotifyDisplayName" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "spotifyConnectedAt" TIMESTAMP(3);
