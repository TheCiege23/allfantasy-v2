-- AlterTable: add a marker column the cron sets when push
-- notifications have been dispatched for a player news record, so
-- subsequent cron runs inside the same look-back window never
-- re-notify for the same story.
ALTER TABLE "player_news" ADD COLUMN IF NOT EXISTS "notification_dispatched_at" TIMESTAMP(3);
