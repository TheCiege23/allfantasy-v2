-- Time Engine: device timezone/time signals and mismatch flags (server UTC remains authoritative).

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "device_timezone_last_seen" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "device_time_last_seen" TIMESTAMP(3);
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "time_mismatch_flag" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "last_time_context_at" TIMESTAMP(3);
