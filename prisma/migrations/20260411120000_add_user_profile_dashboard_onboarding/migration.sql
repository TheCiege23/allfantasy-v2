-- Dashboard Get Started state + extended favorite sports (JSON). Safe to run if column exists.
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "dashboard_onboarding" JSONB;
