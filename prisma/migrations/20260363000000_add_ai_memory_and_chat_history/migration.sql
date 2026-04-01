-- PROMPT 234: AI memory + chat history persistence for Chimmy.
-- Safe/idempotent migration for environments where some objects may already exist.

CREATE TABLE IF NOT EXISTS "ai_memories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT '',
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_memories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_memories_userId_leagueId_scope_key_key"
ON "ai_memories"("userId", "leagueId", "scope", "key");

CREATE INDEX IF NOT EXISTS "ai_memories_userId_idx"
ON "ai_memories"("userId");

CREATE INDEX IF NOT EXISTS "ai_memories_leagueId_idx"
ON "ai_memories"("leagueId");

CREATE INDEX IF NOT EXISTS "ai_memories_scope_idx"
ON "ai_memories"("scope");

CREATE TABLE IF NOT EXISTS "chat_history" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT,
    "leagueId" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_history_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "chat_history"
    ADD COLUMN IF NOT EXISTS "conversationId" TEXT,
    ADD COLUMN IF NOT EXISTS "userId" TEXT,
    ADD COLUMN IF NOT EXISTS "leagueId" TEXT,
    ADD COLUMN IF NOT EXISTS "content" TEXT,
    ADD COLUMN IF NOT EXISTS "meta" JSONB,
    ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3);

UPDATE "chat_history"
SET
    "conversationId" = COALESCE("conversationId", "chat_type"::text, "id"::text),
    "userId" = COALESCE("userId", "user_id"::text),
    "leagueId" = COALESCE("leagueId", "league_id"::text),
    "content" = COALESCE("content", "message"::text),
    "meta" = COALESCE("meta", "metadata"),
    "createdAt" = COALESCE("createdAt", "created_at", CURRENT_TIMESTAMP)
WHERE
    "conversationId" IS NULL
    OR "userId" IS NULL
    OR "leagueId" IS NULL
    OR "content" IS NULL
    OR "meta" IS NULL
    OR "createdAt" IS NULL;

ALTER TABLE "chat_history"
    ALTER COLUMN "conversationId" SET NOT NULL,
    ALTER COLUMN "content" SET NOT NULL,
    ALTER COLUMN "createdAt" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "chat_history_conversationId_createdAt_idx"
ON "chat_history"("conversationId", "createdAt");

CREATE INDEX IF NOT EXISTS "chat_history_userId_createdAt_idx"
ON "chat_history"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "chat_history_leagueId_createdAt_idx"
ON "chat_history"("leagueId", "createdAt");
