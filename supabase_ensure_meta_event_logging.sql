-- Idempotent indexes for Meta Pixel / Conversions API production verification.
-- AnalyticsEvent is the existing append-only analytics table used by the app.

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_toolKey_createdAt_idx"
  ON "AnalyticsEvent" ("toolKey", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_event_toolKey_createdAt_idx"
  ON "AnalyticsEvent" ("event", "toolKey", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_meta_eventId_idx"
  ON "AnalyticsEvent" ((meta->>'eventId'))
  WHERE "toolKey" IN ('meta_capi', 'meta_pixel');

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_meta_eventName_idx"
  ON "AnalyticsEvent" ((meta->>'eventName'))
  WHERE "toolKey" IN ('meta_capi', 'meta_pixel');
