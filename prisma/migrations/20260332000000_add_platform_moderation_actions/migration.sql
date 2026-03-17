-- CreateTable
CREATE TABLE "platform_moderation_actions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_moderation_actions_userId_idx" ON "platform_moderation_actions"("userId");

-- CreateIndex
CREATE INDEX "platform_moderation_actions_userId_actionType_idx" ON "platform_moderation_actions"("userId", "actionType");

-- CreateIndex
CREATE INDEX "platform_moderation_actions_expiresAt_idx" ON "platform_moderation_actions"("expiresAt");
