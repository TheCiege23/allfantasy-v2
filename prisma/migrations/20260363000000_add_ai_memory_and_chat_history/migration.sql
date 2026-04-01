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

DO $$
DECLARE
    has_chat_type BOOLEAN;
    has_user_id_legacy BOOLEAN;
    has_league_id_legacy BOOLEAN;
    has_message_legacy BOOLEAN;
    has_metadata_legacy BOOLEAN;
    has_created_at_legacy BOOLEAN;
    conversation_expr TEXT;
    user_expr TEXT;
    league_expr TEXT;
    content_expr TEXT;
    meta_expr TEXT;
    created_at_expr TEXT;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'chat_history'
          AND column_name = 'chat_type'
    ) INTO has_chat_type;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'chat_history'
          AND column_name = 'user_id'
    ) INTO has_user_id_legacy;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'chat_history'
          AND column_name = 'league_id'
    ) INTO has_league_id_legacy;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'chat_history'
          AND column_name = 'message'
    ) INTO has_message_legacy;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'chat_history'
          AND column_name = 'metadata'
    ) INTO has_metadata_legacy;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'chat_history'
          AND column_name = 'created_at'
    ) INTO has_created_at_legacy;

    conversation_expr := CASE
        WHEN has_chat_type THEN 'COALESCE("conversationId", "chat_type"::text, "id"::text)'
        ELSE 'COALESCE("conversationId", "id"::text)'
    END;

    user_expr := CASE
        WHEN has_user_id_legacy THEN 'COALESCE("userId", "user_id"::text)'
        ELSE '"userId"'
    END;

    league_expr := CASE
        WHEN has_league_id_legacy THEN 'COALESCE("leagueId", "league_id"::text)'
        ELSE '"leagueId"'
    END;

    content_expr := CASE
        WHEN has_message_legacy THEN 'COALESCE("content", "message"::text, '''')'
        ELSE 'COALESCE("content", '''')'
    END;

    meta_expr := CASE
        WHEN has_metadata_legacy THEN 'COALESCE("meta", to_jsonb("metadata"), ''{}''::jsonb)'
        ELSE 'COALESCE("meta", ''{}''::jsonb)'
    END;

    created_at_expr := CASE
        WHEN has_created_at_legacy THEN 'COALESCE("createdAt", "created_at", CURRENT_TIMESTAMP)'
        ELSE 'COALESCE("createdAt", CURRENT_TIMESTAMP)'
    END;

    EXECUTE format(
        'UPDATE "chat_history"
         SET
             "conversationId" = %s,
             "userId" = %s,
             "leagueId" = %s,
             "content" = %s,
             "meta" = %s,
             "createdAt" = %s
         WHERE
             "conversationId" IS NULL
             OR "userId" IS NULL
             OR "leagueId" IS NULL
             OR "content" IS NULL
             OR "meta" IS NULL
             OR "createdAt" IS NULL',
        conversation_expr,
        user_expr,
        league_expr,
        content_expr,
        meta_expr,
        created_at_expr
    );
END $$;

ALTER TABLE "chat_history"
    ALTER COLUMN "conversationId" SET NOT NULL,
    ALTER COLUMN "content" SET NOT NULL,
    ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "createdAt" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "chat_history_conversationId_createdAt_idx"
ON "chat_history"("conversationId", "createdAt");

CREATE INDEX IF NOT EXISTS "chat_history_userId_createdAt_idx"
ON "chat_history"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "chat_history_leagueId_createdAt_idx"
ON "chat_history"("leagueId", "createdAt");
