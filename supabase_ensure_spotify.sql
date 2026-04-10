-- =============================================================================
-- supabase_ensure_spotify.sql
-- Spotify OAuth columns on user_profiles. Safe to re-run.
-- =============================================================================

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "spotifyUserId" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "spotifyDisplayName" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "spotifyEmail" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "spotifyAccessToken" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "spotifyRefreshToken" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "spotifyTokenExpiresAt" TIMESTAMPTZ;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "spotifyIsPremium" BOOLEAN DEFAULT false;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "spotifyConnectedAt" TIMESTAMPTZ;
