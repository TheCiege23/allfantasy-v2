-- Append-only log for Resend webhook email delivery events.
-- svixId is the idempotency key (unique Svix message ID per webhook delivery).
-- Recipient email addresses are never stored; payload is sanitized by the route.

CREATE TABLE "resend_email_events" (
    "id"        TEXT            NOT NULL,
    "svixId"    VARCHAR(128)    NOT NULL,
    "messageId" VARCHAR(128)    NOT NULL,
    "eventType" VARCHAR(64)     NOT NULL,
    "payload"   JSONB,
    "createdAt" TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resend_email_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resend_email_events_svixId_key" ON "resend_email_events"("svixId");
CREATE INDEX "resend_email_events_messageId_idx"   ON "resend_email_events"("messageId");
CREATE INDEX "resend_email_events_eventType_idx"   ON "resend_email_events"("eventType");
CREATE INDEX "resend_email_events_createdAt_idx"   ON "resend_email_events"("createdAt");
