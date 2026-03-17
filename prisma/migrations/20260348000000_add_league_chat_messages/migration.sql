-- CreateTable: League chat (main app League). Syncs with draft chat when liveDraftChatSyncEnabled.
CREATE TABLE "league_chat_messages" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(32) NOT NULL DEFAULT 'text',
    "imageUrl" TEXT,
    "metadata" JSONB,
    "source" VARCHAR(16),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "league_chat_messages_leagueId_idx" ON "league_chat_messages"("leagueId");
CREATE INDEX "league_chat_messages_leagueId_source_idx" ON "league_chat_messages"("leagueId", "source");
CREATE INDEX "league_chat_messages_createdAt_idx" ON "league_chat_messages"("createdAt");

ALTER TABLE "league_chat_messages" ADD CONSTRAINT "league_chat_messages_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_chat_messages" ADD CONSTRAINT "league_chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
