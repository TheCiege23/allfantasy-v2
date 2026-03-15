-- AlterTable: add bio and preferredSports to user_profiles
ALTER TABLE "user_profiles" ADD COLUMN "bio" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN "preferredSports" JSONB;
