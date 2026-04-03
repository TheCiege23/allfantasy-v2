-- DraftSession extensions + queue/chat tables for unified draft room

ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "sleeperDraftId" TEXT;
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "sessionKind" TEXT NOT NULL DEFAULT 'live';
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "nextOverallPick" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "currentRoundNum" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS "draft_sessions_sleeperDraftId_key" ON "draft_sessions"("sleeperDraftId");

ALTER TABLE "draft_picks" ADD COLUMN IF NOT EXISTS "roundPick" INTEGER;
ALTER TABLE "draft_picks" ADD COLUMN IF NOT EXISTS "ownerUserId" TEXT;
ALTER TABLE "draft_picks" ADD COLUMN IF NOT EXISTS "playerImageUrl" TEXT;
ALTER TABLE "draft_picks" ADD COLUMN IF NOT EXISTS "pickedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "draft_queue_entries" (
    "id" TEXT NOT NULL,
    "draftSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_queue_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "draft_queue_entries_draftSessionId_userId_idx" ON "draft_queue_entries"("draftSessionId", "userId");

DO $$ BEGIN
 ALTER TABLE "draft_queue_entries" ADD CONSTRAINT "draft_queue_entries_draftSessionId_fkey" FOREIGN KEY ("draftSessionId") REFERENCES "draft_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "draft_chat_messages" (
    "id" TEXT NOT NULL,
    "draftSessionId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorAvatar" TEXT,
    "text" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'message',
    "metadata" JSONB,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "draft_chat_messages_draftSessionId_idx" ON "draft_chat_messages"("draftSessionId");

DO $$ BEGIN
 ALTER TABLE "draft_chat_messages" ADD CONSTRAINT "draft_chat_messages_draftSessionId_fkey" FOREIGN KEY ("draftSessionId") REFERENCES "draft_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
