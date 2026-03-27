CREATE INDEX "invite_links_createdByUserId_type_createdAt_idx"
ON "invite_links"("createdByUserId", "type", "createdAt");

CREATE INDEX "invite_links_type_targetId_idx"
ON "invite_links"("type", "targetId");

CREATE INDEX "invite_links_status_expiresAt_idx"
ON "invite_links"("status", "expiresAt");

CREATE INDEX "invite_link_events_inviteLinkId_eventType_createdAt_idx"
ON "invite_link_events"("inviteLinkId", "eventType", "createdAt");

CREATE INDEX "invite_link_events_channel_createdAt_idx"
ON "invite_link_events"("channel", "createdAt");
