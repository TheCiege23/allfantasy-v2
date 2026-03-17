-- AlterTable: add tradedPicks to draft_sessions
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "tradedPicks" JSONB DEFAULT '[]';

-- CreateTable: draft pick trade proposals
CREATE TABLE "draft_pick_trade_proposals" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "proposerRosterId" TEXT NOT NULL,
    "receiverRosterId" TEXT NOT NULL,
    "giveRound" INTEGER NOT NULL,
    "giveSlot" INTEGER NOT NULL,
    "giveOriginalRosterId" TEXT NOT NULL,
    "receiveRound" INTEGER NOT NULL,
    "receiveSlot" INTEGER NOT NULL,
    "receiveOriginalRosterId" TEXT NOT NULL,
    "proposerName" TEXT,
    "receiverName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "respondedAt" TIMESTAMP(3),
    "responsePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_pick_trade_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "draft_pick_trade_proposals_sessionId_idx" ON "draft_pick_trade_proposals"("sessionId");
CREATE INDEX "draft_pick_trade_proposals_sessionId_receiverRosterId_idx" ON "draft_pick_trade_proposals"("sessionId", "receiverRosterId");
CREATE INDEX "draft_pick_trade_proposals_sessionId_status_idx" ON "draft_pick_trade_proposals"("sessionId", "status");

-- AddForeignKey
ALTER TABLE "draft_pick_trade_proposals" ADD CONSTRAINT "draft_pick_trade_proposals_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "draft_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
