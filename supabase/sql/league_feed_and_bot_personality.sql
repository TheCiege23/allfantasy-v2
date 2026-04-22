-- League feed uses existing `league_events` rows with structured JSON in `payload`.
-- This file adds persistence for anti-repeat / light rate limits on AI flavor text.
-- Aligns with Prisma model `AiBotMessageHistory` @@map("ai_bot_message_history").

CREATE TABLE IF NOT EXISTS public.ai_bot_message_history (
  id text NOT NULL,
  "leagueId" text NOT NULL,
  "botId" character varying(128) NOT NULL,
  "eventType" character varying(64) NOT NULL,
  "contentHash" character varying(64) NOT NULL,
  "templateKey" character varying(96) NOT NULL,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ai_bot_message_history_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ai_bot_message_history_league_bot_created_idx
  ON public.ai_bot_message_history ("leagueId", "botId", "createdAt");

CREATE INDEX IF NOT EXISTS ai_bot_message_history_content_hash_idx
  ON public.ai_bot_message_history ("contentHash");

ALTER TABLE public.ai_bot_message_history
  DROP CONSTRAINT IF EXISTS ai_bot_message_history_leagueId_fkey;

ALTER TABLE public.ai_bot_message_history
  ADD CONSTRAINT ai_bot_message_history_leagueId_fkey
  FOREIGN KEY ("leagueId") REFERENCES public.leagues(id) ON UPDATE CASCADE ON DELETE CASCADE;

COMMENT ON TABLE public.ai_bot_message_history IS 'Recent AI bot voice lines for dedupe and throttling; league feed events remain in league_events.';

-- Retention (optional): delete rows older than 30 days periodically via cron / job.
-- Example:
-- DELETE FROM public.ai_bot_message_history WHERE "createdAt" < NOW() - INTERVAL '30 days';
