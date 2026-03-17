-- Viral Invite Engine (PROMPT 142): InviteLink + InviteLinkEvent

CREATE TABLE IF NOT EXISTS "invite_links" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(24) NOT NULL,
    "token" VARCHAR(32) NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "targetId" VARCHAR(128),
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER NOT NULL DEFAULT 0,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invite_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "invite_links_token_key" ON "invite_links"("token");
CREATE INDEX IF NOT EXISTS "invite_links_createdByUserId_idx" ON "invite_links"("createdByUserId");
CREATE INDEX IF NOT EXISTS "invite_links_type_idx" ON "invite_links"("type");
CREATE INDEX IF NOT EXISTS "invite_links_status_idx" ON "invite_links"("status");

ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "invite_link_events" (
    "id" TEXT NOT NULL,
    "inviteLinkId" TEXT NOT NULL,
    "eventType" VARCHAR(32) NOT NULL,
    "channel" VARCHAR(24),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_link_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "invite_link_events_inviteLinkId_createdAt_idx" ON "invite_link_events"("inviteLinkId", "createdAt");
CREATE INDEX IF NOT EXISTS "invite_link_events_eventType_idx" ON "invite_link_events"("eventType");

ALTER TABLE "invite_link_events" ADD CONSTRAINT "invite_link_events_inviteLinkId_fkey" FOREIGN KEY ("inviteLinkId") REFERENCES "invite_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
