-- Mock draft engine: status, inviteToken, slotConfig, and isolated chat
ALTER TABLE "mock_drafts" ADD COLUMN IF NOT EXISTS "inviteToken" TEXT;
ALTER TABLE "mock_drafts" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pre_draft';
ALTER TABLE "mock_drafts" ADD COLUMN IF NOT EXISTS "slotConfig" JSONB;
UPDATE "mock_drafts" SET "results" = '[]' WHERE "results" IS NULL;
ALTER TABLE "mock_drafts" ALTER COLUMN "results" SET DEFAULT '[]';
CREATE UNIQUE INDEX IF NOT EXISTS "mock_drafts_inviteToken_key" ON "mock_drafts"("inviteToken");
CREATE INDEX IF NOT EXISTS "mock_drafts_status_idx" ON "mock_drafts"("status");
CREATE INDEX IF NOT EXISTS "mock_drafts_inviteToken_idx" ON "mock_drafts"("inviteToken");

CREATE TABLE IF NOT EXISTS "mock_draft_chats" (
    "id" TEXT NOT NULL,
    "mockDraftId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mock_draft_chats_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "mock_draft_chats_mockDraftId_idx" ON "mock_draft_chats"("mockDraftId");
ALTER TABLE "mock_draft_chats" DROP CONSTRAINT IF EXISTS "mock_draft_chats_mockDraftId_fkey";
ALTER TABLE "mock_draft_chats" ADD CONSTRAINT "mock_draft_chats_mockDraftId_fkey" FOREIGN KEY ("mockDraftId") REFERENCES "mock_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
