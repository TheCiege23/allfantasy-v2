-- CreateTable
CREATE TABLE "mock_draft_rooms" (
    "id" TEXT NOT NULL,
    "createdById" TEXT,
    "sport" TEXT NOT NULL DEFAULT 'NFL',
    "numTeams" INTEGER NOT NULL DEFAULT 12,
    "numRounds" INTEGER NOT NULL DEFAULT 15,
    "timerSeconds" INTEGER NOT NULL DEFAULT 60,
    "scoringType" TEXT NOT NULL DEFAULT 'PPR',
    "rosterSettings" JSONB,
    "playerPool" TEXT NOT NULL DEFAULT 'all',
    "inviteCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "draftOrder" JSONB,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mock_draft_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_room_pick_records" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT,
    "roomId" TEXT,
    "round" INTEGER NOT NULL,
    "pickNumber" INTEGER NOT NULL,
    "overallPick" INTEGER NOT NULL,
    "originalOwnerId" TEXT NOT NULL,
    "currentOwnerId" TEXT NOT NULL,
    "pickedById" TEXT,
    "playerId" TEXT,
    "playerName" TEXT,
    "position" TEXT,
    "team" TEXT,
    "isTraded" BOOLEAN NOT NULL DEFAULT false,
    "tradeSource" JSONB,
    "autopicked" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_room_pick_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_room_user_queues" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "leagueId" TEXT,
    "roomId" TEXT,
    "playerIds" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_room_user_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_room_chat_messages" (
    "id" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "leagueId" TEXT,
    "roomId" TEXT,
    "userId" TEXT,
    "authorDisplayName" TEXT,
    "authorAvatar" TEXT,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_room_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_room_state" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "currentPick" INTEGER NOT NULL DEFAULT 1,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "currentTeamIndex" INTEGER NOT NULL DEFAULT 0,
    "timerEndsAt" TIMESTAMP(3),
    "timerPaused" BOOLEAN NOT NULL DEFAULT false,
    "pickOrder" JSONB,
    "leagueId" TEXT,
    "roomId" TEXT,
    "numTeams" INTEGER NOT NULL DEFAULT 12,
    "numRounds" INTEGER NOT NULL DEFAULT 15,
    "timerSeconds" INTEGER NOT NULL DEFAULT 60,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_room_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_autopick_settings" (
    "userId" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_autopick_settings_pkey" PRIMARY KEY ("userId","sessionKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "mock_draft_rooms_inviteCode_key" ON "mock_draft_rooms"("inviteCode");

-- CreateIndex
CREATE INDEX "mock_draft_rooms_createdById_idx" ON "mock_draft_rooms"("createdById");

-- CreateIndex
CREATE INDEX "draft_room_pick_records_leagueId_idx" ON "draft_room_pick_records"("leagueId");

-- CreateIndex
CREATE INDEX "draft_room_pick_records_roomId_idx" ON "draft_room_pick_records"("roomId");

-- CreateIndex
CREATE INDEX "draft_room_pick_records_roomId_overallPick_idx" ON "draft_room_pick_records"("roomId", "overallPick");

-- CreateIndex
CREATE INDEX "draft_room_pick_records_leagueId_overallPick_idx" ON "draft_room_pick_records"("leagueId", "overallPick");

-- CreateIndex
CREATE UNIQUE INDEX "draft_room_user_queues_userId_sessionKey_key" ON "draft_room_user_queues"("userId", "sessionKey");

-- CreateIndex
CREATE INDEX "draft_room_user_queues_sessionKey_idx" ON "draft_room_user_queues"("sessionKey");

-- CreateIndex
CREATE INDEX "draft_room_chat_messages_sessionKey_createdAt_idx" ON "draft_room_chat_messages"("sessionKey", "createdAt");

-- CreateIndex
CREATE INDEX "draft_room_state_leagueId_idx" ON "draft_room_state"("leagueId");

-- CreateIndex
CREATE INDEX "draft_room_state_roomId_idx" ON "draft_room_state"("roomId");

-- AddForeignKey
ALTER TABLE "mock_draft_rooms" ADD CONSTRAINT "mock_draft_rooms_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_room_pick_records" ADD CONSTRAINT "draft_room_pick_records_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "mock_draft_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_room_user_queues" ADD CONSTRAINT "draft_room_user_queues_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_room_chat_messages" ADD CONSTRAINT "draft_room_chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_autopick_settings" ADD CONSTRAINT "draft_autopick_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
