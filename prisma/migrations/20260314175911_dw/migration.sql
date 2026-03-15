-- CreateTable
CREATE TABLE "dw_player_game_facts" (
    "factId" TEXT NOT NULL,
    "playerId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "gameId" VARCHAR(64) NOT NULL,
    "teamId" VARCHAR(32),
    "opponentTeamId" VARCHAR(32),
    "stat_payload" JSONB NOT NULL,
    "normalized_stats" JSONB NOT NULL,
    "fantasyPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoringPeriod" INTEGER NOT NULL DEFAULT 0,
    "season" INTEGER,
    "weekOrRound" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dw_player_game_facts_pkey" PRIMARY KEY ("factId")
);

-- CreateTable
CREATE TABLE "dw_team_game_facts" (
    "factId" TEXT NOT NULL,
    "teamId" VARCHAR(32) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "gameId" VARCHAR(64) NOT NULL,
    "pointsScored" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "opponentPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "result" VARCHAR(8),
    "season" INTEGER,
    "weekOrRound" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dw_team_game_facts_pkey" PRIMARY KEY ("factId")
);

-- CreateTable
CREATE TABLE "dw_roster_snapshots" (
    "snapshotId" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "teamId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "weekOrPeriod" INTEGER NOT NULL,
    "season" INTEGER,
    "roster_players" JSONB NOT NULL,
    "lineup_players" JSONB NOT NULL,
    "bench_players" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dw_roster_snapshots_pkey" PRIMARY KEY ("snapshotId")
);

-- CreateTable
CREATE TABLE "dw_matchup_facts" (
    "matchupId" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "weekOrPeriod" INTEGER NOT NULL,
    "teamA" VARCHAR(64) NOT NULL,
    "teamB" VARCHAR(64) NOT NULL,
    "scoreA" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreB" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "winnerTeamId" VARCHAR(64),
    "season" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dw_matchup_facts_pkey" PRIMARY KEY ("matchupId")
);

-- CreateTable
CREATE TABLE "dw_draft_facts" (
    "draftId" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "round" INTEGER NOT NULL,
    "pickNumber" INTEGER NOT NULL,
    "playerId" VARCHAR(64) NOT NULL,
    "managerId" VARCHAR(64),
    "season" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dw_draft_facts_pkey" PRIMARY KEY ("draftId")
);

-- CreateTable
CREATE TABLE "dw_transaction_facts" (
    "transactionId" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "type" VARCHAR(24) NOT NULL,
    "playerId" VARCHAR(64),
    "managerId" VARCHAR(64),
    "rosterId" VARCHAR(64),
    "payload" JSONB,
    "season" INTEGER,
    "weekOrPeriod" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dw_transaction_facts_pkey" PRIMARY KEY ("transactionId")
);

-- CreateTable
CREATE TABLE "dw_season_standing_facts" (
    "standingId" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(12) NOT NULL,
    "season" INTEGER NOT NULL,
    "teamId" VARCHAR(64) NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsAgainst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dw_season_standing_facts_pkey" PRIMARY KEY ("standingId")
);

-- CreateIndex
CREATE INDEX "dw_player_game_facts_playerId_sport_idx" ON "dw_player_game_facts"("playerId", "sport");

-- CreateIndex
CREATE INDEX "dw_player_game_facts_sport_scoringPeriod_idx" ON "dw_player_game_facts"("sport", "scoringPeriod");

-- CreateIndex
CREATE INDEX "dw_player_game_facts_sport_season_weekOrRound_idx" ON "dw_player_game_facts"("sport", "season", "weekOrRound");

-- CreateIndex
CREATE INDEX "dw_player_game_facts_gameId_idx" ON "dw_player_game_facts"("gameId");

-- CreateIndex
CREATE INDEX "dw_team_game_facts_teamId_sport_idx" ON "dw_team_game_facts"("teamId", "sport");

-- CreateIndex
CREATE INDEX "dw_team_game_facts_sport_season_weekOrRound_idx" ON "dw_team_game_facts"("sport", "season", "weekOrRound");

-- CreateIndex
CREATE INDEX "dw_team_game_facts_gameId_idx" ON "dw_team_game_facts"("gameId");

-- CreateIndex
CREATE INDEX "dw_roster_snapshots_leagueId_weekOrPeriod_idx" ON "dw_roster_snapshots"("leagueId", "weekOrPeriod");

-- CreateIndex
CREATE INDEX "dw_roster_snapshots_teamId_sport_idx" ON "dw_roster_snapshots"("teamId", "sport");

-- CreateIndex
CREATE INDEX "dw_roster_snapshots_sport_season_idx" ON "dw_roster_snapshots"("sport", "season");

-- CreateIndex
CREATE INDEX "dw_matchup_facts_leagueId_weekOrPeriod_idx" ON "dw_matchup_facts"("leagueId", "weekOrPeriod");

-- CreateIndex
CREATE INDEX "dw_matchup_facts_leagueId_season_idx" ON "dw_matchup_facts"("leagueId", "season");

-- CreateIndex
CREATE INDEX "dw_draft_facts_leagueId_idx" ON "dw_draft_facts"("leagueId");

-- CreateIndex
CREATE INDEX "dw_draft_facts_leagueId_round_idx" ON "dw_draft_facts"("leagueId", "round");

-- CreateIndex
CREATE INDEX "dw_draft_facts_playerId_sport_idx" ON "dw_draft_facts"("playerId", "sport");

-- CreateIndex
CREATE INDEX "dw_transaction_facts_leagueId_createdAt_idx" ON "dw_transaction_facts"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX "dw_transaction_facts_playerId_sport_idx" ON "dw_transaction_facts"("playerId", "sport");

-- CreateIndex
CREATE INDEX "dw_transaction_facts_type_idx" ON "dw_transaction_facts"("type");

-- CreateIndex
CREATE INDEX "dw_season_standing_facts_leagueId_season_idx" ON "dw_season_standing_facts"("leagueId", "season");

-- CreateIndex
CREATE INDEX "dw_season_standing_facts_teamId_sport_idx" ON "dw_season_standing_facts"("teamId", "sport");

-- CreateIndex
CREATE UNIQUE INDEX "dw_season_standing_facts_leagueId_season_teamId_key" ON "dw_season_standing_facts"("leagueId", "season", "teamId");
