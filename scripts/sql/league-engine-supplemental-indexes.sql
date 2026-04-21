-- Supplemental indexes for league-engine hot paths (read + dedupe).
-- Safe to run repeatedly (IF NOT EXISTS). Skip when tables are absent.

-- Platform notifications: unread badge polls (userId + readAt null)
DO $$
BEGIN
  IF to_regclass('public.platform_notifications') IS NOT NULL THEN
    EXECUTE $sql$
      create index if not exists idx_platform_notifications_user_unread
        on platform_notifications("userId", "createdAt" desc)
        where "readAt" is null
    $sql$;
  END IF;
END $$;
