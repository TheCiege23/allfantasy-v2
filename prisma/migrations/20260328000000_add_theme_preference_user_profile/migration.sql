-- AlterTable: add themePreference to user_profiles (dark | light | legacy)
ALTER TABLE "user_profiles" ADD COLUMN "themePreference" TEXT;
