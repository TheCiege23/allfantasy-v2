-- Shared platform core tables for chat, notifications, and wallet ledger
-- Safe/idempotent artifact for rollout

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "platform_chat_threads" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "threadType" TEXT NOT NULL,
  "productType" TEXT NOT NULL DEFAULT 'shared',
  "title" TEXT,
  "createdByUserId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastMessageAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "platform_chat_threads_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "app_users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "platform_chat_thread_members" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "threadId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastReadAt" TIMESTAMPTZ,
  "isMuted" BOOLEAN NOT NULL DEFAULT FALSE,
  "isBlocked" BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT "platform_chat_thread_members_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "platform_chat_threads"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "platform_chat_thread_members_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "app_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "platform_chat_messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "threadId" UUID NOT NULL,
  "senderUserId" UUID,
  "messageType" TEXT NOT NULL DEFAULT 'text',
  "body" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "platform_chat_messages_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "platform_chat_threads"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "platform_chat_messages_senderUserId_fkey"
    FOREIGN KEY ("senderUserId") REFERENCES "app_users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "platform_notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sourceKey" TEXT UNIQUE,
  "userId" UUID NOT NULL,
  "productType" TEXT NOT NULL DEFAULT 'shared',
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "severity" TEXT NOT NULL DEFAULT 'low',
  "meta" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "readAt" TIMESTAMPTZ,
  CONSTRAINT "platform_notifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "app_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "platform_wallet_accounts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "balanceCents" INTEGER NOT NULL DEFAULT 0,
  "pendingBalanceCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "platform_wallet_accounts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "app_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "wallet_ledger_entries" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sourceKey" TEXT UNIQUE,
  "walletAccountId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "entryType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'completed',
  "amountCents" INTEGER NOT NULL,
  "description" TEXT,
  "refProduct" TEXT,
  "refId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "effectiveAt" TIMESTAMPTZ,
  CONSTRAINT "wallet_ledger_entries_walletAccountId_fkey"
    FOREIGN KEY ("walletAccountId") REFERENCES "platform_wallet_accounts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "wallet_ledger_entries_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "app_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_chat_thread_members_threadId_userId_key"
  ON "platform_chat_thread_members"("threadId", "userId");

CREATE INDEX IF NOT EXISTS "platform_chat_threads_threadType_lastMessageAt_idx"
  ON "platform_chat_threads"("threadType", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "platform_chat_threads_createdByUserId_idx"
  ON "platform_chat_threads"("createdByUserId");

CREATE INDEX IF NOT EXISTS "platform_chat_thread_members_userId_joinedAt_idx"
  ON "platform_chat_thread_members"("userId", "joinedAt");

CREATE INDEX IF NOT EXISTS "platform_chat_messages_threadId_createdAt_idx"
  ON "platform_chat_messages"("threadId", "createdAt");
CREATE INDEX IF NOT EXISTS "platform_chat_messages_senderUserId_createdAt_idx"
  ON "platform_chat_messages"("senderUserId", "createdAt");

CREATE INDEX IF NOT EXISTS "platform_notifications_userId_createdAt_idx"
  ON "platform_notifications"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "platform_notifications_userId_readAt_idx"
  ON "platform_notifications"("userId", "readAt");

CREATE INDEX IF NOT EXISTS "wallet_ledger_entries_walletAccountId_createdAt_idx"
  ON "wallet_ledger_entries"("walletAccountId", "createdAt");
CREATE INDEX IF NOT EXISTS "wallet_ledger_entries_userId_createdAt_idx"
  ON "wallet_ledger_entries"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "wallet_ledger_entries_entryType_status_idx"
  ON "wallet_ledger_entries"("entryType", "status");
