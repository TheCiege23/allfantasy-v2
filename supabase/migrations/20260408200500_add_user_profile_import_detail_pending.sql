ALTER TABLE "user_profiles"
ADD COLUMN IF NOT EXISTS "league_import_detail_pending" BOOLEAN DEFAULT false;
