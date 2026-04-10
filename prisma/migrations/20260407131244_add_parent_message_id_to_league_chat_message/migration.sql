-- AlterTable
ALTER TABLE "league_chat_messages" ADD COLUMN     "parentMessageId" TEXT;

-- CreateIndex
CREATE INDEX "league_chat_messages_parentMessageId_idx" ON "league_chat_messages"("parentMessageId");
