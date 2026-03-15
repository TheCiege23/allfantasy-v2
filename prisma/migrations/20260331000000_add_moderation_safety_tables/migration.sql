-- CreateTable
CREATE TABLE "platform_blocked_users" (
    "id" TEXT NOT NULL,
    "blockerUserId" TEXT NOT NULL,
    "blockedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_blocked_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_message_reports" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_message_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_user_reports" (
    "id" TEXT NOT NULL,
    "reportedUserId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_user_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_blocked_users_blockerUserId_blockedUserId_key" ON "platform_blocked_users"("blockerUserId", "blockedUserId");

-- CreateIndex
CREATE INDEX "platform_blocked_users_blockerUserId_idx" ON "platform_blocked_users"("blockerUserId");

-- CreateIndex
CREATE INDEX "platform_blocked_users_blockedUserId_idx" ON "platform_blocked_users"("blockedUserId");

-- CreateIndex
CREATE INDEX "platform_message_reports_reporterUserId_idx" ON "platform_message_reports"("reporterUserId");

-- CreateIndex
CREATE INDEX "platform_message_reports_messageId_threadId_idx" ON "platform_message_reports"("messageId", "threadId");

-- CreateIndex
CREATE INDEX "platform_user_reports_reporterUserId_idx" ON "platform_user_reports"("reporterUserId");

-- CreateIndex
CREATE INDEX "platform_user_reports_reportedUserId_idx" ON "platform_user_reports"("reportedUserId");

-- AddForeignKey
ALTER TABLE "platform_blocked_users" ADD CONSTRAINT "platform_blocked_users_blockerUserId_fkey" FOREIGN KEY ("blockerUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_blocked_users" ADD CONSTRAINT "platform_blocked_users_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_message_reports" ADD CONSTRAINT "platform_message_reports_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_user_reports" ADD CONSTRAINT "platform_user_reports_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_user_reports" ADD CONSTRAINT "platform_user_reports_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
