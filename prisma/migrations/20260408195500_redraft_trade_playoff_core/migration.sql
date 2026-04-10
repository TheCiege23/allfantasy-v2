-- REDRAFT normalized core tables for trades and playoffs.
-- Additive migration: does not remove/rename existing redraft trade/playoff tables.

CREATE TABLE IF NOT EXISTS "redraft_trade_proposals" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "proposerRosterId" TEXT NOT NULL,
    "receiverRosterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "vetoMode" TEXT NOT NULL DEFAULT 'commissioner',
    "vetoThreshold" INTEGER,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redraft_trade_proposals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "redraft_trade_proposals_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_trade_proposals_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_trade_proposals_proposerRosterId_fkey" FOREIGN KEY ("proposerRosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_trade_proposals_receiverRosterId_fkey" FOREIGN KEY ("receiverRosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_trade_proposals_status_check" CHECK ("status" IN ('pending', 'accepted', 'rejected', 'vetoed', 'cancelled', 'expired', 'processed')),
    CONSTRAINT "redraft_trade_proposals_veto_mode_check" CHECK ("vetoMode" IN ('commissioner', 'league_vote', 'no_veto')),
    CONSTRAINT "redraft_trade_proposals_rosters_distinct_check" CHECK ("proposerRosterId" <> "receiverRosterId")
);

CREATE INDEX IF NOT EXISTS "redraft_trade_proposals_league_status_idx" ON "redraft_trade_proposals"("leagueId", "status");
CREATE INDEX IF NOT EXISTS "redraft_trade_proposals_season_created_idx" ON "redraft_trade_proposals"("seasonId", "createdAt");

CREATE TABLE IF NOT EXISTS "redraft_trade_assets" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "fromRosterId" TEXT NOT NULL,
    "toRosterId" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "playerId" TEXT,
    "playerName" TEXT,
    "pickSeason" INTEGER,
    "pickRound" INTEGER,
    "pickNumber" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redraft_trade_assets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "redraft_trade_assets_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "redraft_trade_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_trade_assets_fromRosterId_fkey" FOREIGN KEY ("fromRosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_trade_assets_toRosterId_fkey" FOREIGN KEY ("toRosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_trade_assets_asset_type_check" CHECK ("assetType" IN ('player', 'draft_pick', 'faab', 'future_consideration')),
    CONSTRAINT "redraft_trade_assets_direction_check" CHECK ("fromRosterId" <> "toRosterId")
);

CREATE INDEX IF NOT EXISTS "redraft_trade_assets_proposal_idx" ON "redraft_trade_assets"("proposalId");
CREATE INDEX IF NOT EXISTS "redraft_trade_assets_roster_idx" ON "redraft_trade_assets"("fromRosterId", "toRosterId");

CREATE TABLE IF NOT EXISTS "redraft_trade_votes" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redraft_trade_votes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "redraft_trade_votes_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "redraft_trade_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_trade_votes_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_trade_votes_vote_check" CHECK ("vote" IN ('approve', 'veto')),
    CONSTRAINT "redraft_trade_votes_unique" UNIQUE ("proposalId", "rosterId")
);

CREATE INDEX IF NOT EXISTS "redraft_trade_votes_proposal_vote_idx" ON "redraft_trade_votes"("proposalId", "vote");

CREATE TABLE IF NOT EXISTS "redraft_trade_decisions" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "decidedByUserId" TEXT,
    "decisionReason" TEXT,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redraft_trade_decisions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "redraft_trade_decisions_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "redraft_trade_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_trade_decisions_decision_check" CHECK ("decision" IN ('accepted', 'rejected', 'vetoed', 'cancelled', 'expired', 'processed')),
    CONSTRAINT "redraft_trade_decisions_unique" UNIQUE ("proposalId")
);

CREATE TABLE IF NOT EXISTS "redraft_playoff_rounds" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "bracketId" TEXT,
    "roundNumber" INTEGER NOT NULL,
    "roundName" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redraft_playoff_rounds_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "redraft_playoff_rounds_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_playoff_rounds_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "redraft_playoff_brackets"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "redraft_playoff_rounds_status_check" CHECK ("status" IN ('pending', 'active', 'completed', 'cancelled')),
    CONSTRAINT "redraft_playoff_rounds_round_check" CHECK ("roundNumber" > 0),
    CONSTRAINT "redraft_playoff_rounds_unique" UNIQUE ("seasonId", "roundNumber")
);

CREATE INDEX IF NOT EXISTS "redraft_playoff_rounds_season_status_idx" ON "redraft_playoff_rounds"("seasonId", "status");

CREATE TABLE IF NOT EXISTS "redraft_playoff_seeds" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "qualifiedBy" TEXT,
    "pointsFor" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redraft_playoff_seeds_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "redraft_playoff_seeds_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_playoff_seeds_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_playoff_seeds_seed_check" CHECK ("seed" > 0),
    CONSTRAINT "redraft_playoff_seeds_unique_seed" UNIQUE ("seasonId", "seed"),
    CONSTRAINT "redraft_playoff_seeds_unique_roster" UNIQUE ("seasonId", "rosterId")
);

CREATE TABLE IF NOT EXISTS "redraft_playoff_matchups" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "matchupNumber" INTEGER NOT NULL,
    "homeRosterId" TEXT,
    "awayRosterId" TEXT,
    "homeSeed" INTEGER,
    "awaySeed" INTEGER,
    "homeScore" DOUBLE PRECISION,
    "awayScore" DOUBLE PRECISION,
    "winnerRosterId" TEXT,
    "nextMatchupId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redraft_playoff_matchups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "redraft_playoff_matchups_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_playoff_matchups_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "redraft_playoff_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "redraft_playoff_matchups_homeRosterId_fkey" FOREIGN KEY ("homeRosterId") REFERENCES "redraft_rosters"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "redraft_playoff_matchups_awayRosterId_fkey" FOREIGN KEY ("awayRosterId") REFERENCES "redraft_rosters"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "redraft_playoff_matchups_winnerRosterId_fkey" FOREIGN KEY ("winnerRosterId") REFERENCES "redraft_rosters"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "redraft_playoff_matchups_nextMatchupId_fkey" FOREIGN KEY ("nextMatchupId") REFERENCES "redraft_playoff_matchups"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "redraft_playoff_matchups_status_check" CHECK ("status" IN ('scheduled', 'in_progress', 'final', 'bye', 'cancelled')),
    CONSTRAINT "redraft_playoff_matchups_number_check" CHECK ("matchupNumber" > 0),
    CONSTRAINT "redraft_playoff_matchups_unique" UNIQUE ("roundId", "matchupNumber")
);

CREATE INDEX IF NOT EXISTS "redraft_playoff_matchups_round_status_idx" ON "redraft_playoff_matchups"("roundId", "status");
CREATE INDEX IF NOT EXISTS "redraft_playoff_matchups_season_idx" ON "redraft_playoff_matchups"("seasonId");
