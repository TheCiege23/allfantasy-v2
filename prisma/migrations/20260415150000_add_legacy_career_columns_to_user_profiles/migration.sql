-- AlterTable: add denormalized legacy-career snapshot columns the
-- rank route already reads via $queryRaw. Idempotent ADD so prod,
-- staging, and CI all end up with the same shape.
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "legacy_career_tier" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "legacy_career_tier_name" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "legacy_career_level" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "legacy_career_xp" BIGINT;
