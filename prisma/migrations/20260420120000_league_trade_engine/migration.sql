-- Canonical in-season trades (platform rosters). Distinct from legacy LeagueTrade (Sleeper import history).

CREATE TABLE "af_league_trades" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "proposedByUserId" TEXT NOT NULL,
    "proposerRosterId" TEXT NOT NULL,
    "receiverRosterId" TEXT NOT NULL,
    "parentTradeId" TEXT,
    "rootTradeId" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "reviewType" VARCHAR(24) NOT NULL DEFAULT 'commissioner',
    "processingDelayHours" INTEGER,
    "vetoThresholdPercent" INTEGER,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "scheduledProcessAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "af_league_trades_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "af_league_trade_items" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "itemType" VARCHAR(32) NOT NULL,
    "itemReference" TEXT,
    "fromRosterId" TEXT NOT NULL,
    "toRosterId" TEXT NOT NULL,
    "faabAmount" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "af_league_trade_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "af_league_trade_status_history" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "fromStatus" VARCHAR(32),
    "toStatus" VARCHAR(32) NOT NULL,
    "actorUserId" TEXT,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "af_league_trade_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "af_league_trade_votes" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "voterRosterId" TEXT NOT NULL,
    "vote" VARCHAR(24) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "af_league_trade_votes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "af_league_trade_processing_events" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "eventType" VARCHAR(48) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "af_league_trade_processing_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "af_league_trades_leagueId_status_idx" ON "af_league_trades"("leagueId", "status");
CREATE INDEX "af_league_trades_proposerRosterId_idx" ON "af_league_trades"("proposerRosterId");
CREATE INDEX "af_league_trades_receiverRosterId_idx" ON "af_league_trades"("receiverRosterId");
CREATE INDEX "af_league_trades_parentTradeId_idx" ON "af_league_trades"("parentTradeId");
CREATE INDEX "af_league_trades_expiresAt_idx" ON "af_league_trades"("expiresAt");

CREATE INDEX "af_league_trade_items_tradeId_idx" ON "af_league_trade_items"("tradeId");
CREATE INDEX "af_league_trade_items_from_to_idx" ON "af_league_trade_items"("fromRosterId", "toRosterId");

CREATE INDEX "af_league_trade_status_history_tradeId_createdAt_idx" ON "af_league_trade_status_history"("tradeId", "createdAt");

CREATE UNIQUE INDEX "af_league_trade_votes_tradeId_voterRosterId_key" ON "af_league_trade_votes"("tradeId", "voterRosterId");
CREATE INDEX "af_league_trade_votes_tradeId_vote_idx" ON "af_league_trade_votes"("tradeId", "vote");

CREATE INDEX "af_league_trade_processing_events_tradeId_createdAt_idx" ON "af_league_trade_processing_events"("tradeId", "createdAt");

ALTER TABLE "af_league_trades" ADD CONSTRAINT "af_league_trades_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "af_league_trades" ADD CONSTRAINT "af_league_trades_proposedByUserId_fkey" FOREIGN KEY ("proposedByUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "af_league_trades" ADD CONSTRAINT "af_league_trades_proposerRosterId_fkey" FOREIGN KEY ("proposerRosterId") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "af_league_trades" ADD CONSTRAINT "af_league_trades_receiverRosterId_fkey" FOREIGN KEY ("receiverRosterId") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "af_league_trades" ADD CONSTRAINT "af_league_trades_parentTradeId_fkey" FOREIGN KEY ("parentTradeId") REFERENCES "af_league_trades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "af_league_trade_items" ADD CONSTRAINT "af_league_trade_items_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "af_league_trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "af_league_trade_status_history" ADD CONSTRAINT "af_league_trade_status_history_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "af_league_trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "af_league_trade_votes" ADD CONSTRAINT "af_league_trade_votes_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "af_league_trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "af_league_trade_votes" ADD CONSTRAINT "af_league_trade_votes_voterRosterId_fkey" FOREIGN KEY ("voterRosterId") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "af_league_trade_processing_events" ADD CONSTRAINT "af_league_trade_processing_events_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "af_league_trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
