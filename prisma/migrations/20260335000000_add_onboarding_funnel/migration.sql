-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "onboardingStep" TEXT,
ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);
