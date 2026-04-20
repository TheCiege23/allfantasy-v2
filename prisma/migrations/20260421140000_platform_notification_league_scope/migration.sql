-- Scope in-app notifications to a league when applicable
ALTER TABLE "platform_notifications" ADD COLUMN IF NOT EXISTS "leagueId" TEXT;

CREATE INDEX IF NOT EXISTS "platform_notifications_userId_leagueId_createdAt_idx" ON "platform_notifications"("userId", "leagueId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'platform_notifications_leagueId_fkey'
  ) THEN
    ALTER TABLE "platform_notifications"
      ADD CONSTRAINT "platform_notifications_leagueId_fkey"
      FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
