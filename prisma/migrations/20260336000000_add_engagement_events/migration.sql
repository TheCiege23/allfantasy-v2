-- CreateTable
CREATE TABLE IF NOT EXISTS "engagement_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "engagement_events_userId_createdAt_idx" ON "engagement_events"("userId", "createdAt");
-- CreateIndex
CREATE INDEX IF NOT EXISTS "engagement_events_userId_eventType_idx" ON "engagement_events"("userId", "eventType");
-- CreateIndex
CREATE INDEX IF NOT EXISTS "engagement_events_eventType_idx" ON "engagement_events"("eventType");

-- AddForeignKey (AppUser relation)
ALTER TABLE "engagement_events" ADD CONSTRAINT "engagement_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
