-- CreateTable
CREATE TABLE "ai_manager_audit_log" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "reason" TEXT,
    "triggeredBy" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_manager_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_manager_audit_log_leagueId_idx" ON "ai_manager_audit_log"("leagueId");

-- CreateIndex
CREATE INDEX "ai_manager_audit_log_leagueId_rosterId_idx" ON "ai_manager_audit_log"("leagueId", "rosterId");

-- CreateIndex
CREATE INDEX "ai_manager_audit_log_leagueId_action_idx" ON "ai_manager_audit_log"("leagueId", "action");

-- CreateIndex
CREATE INDEX "ai_manager_audit_log_createdAt_idx" ON "ai_manager_audit_log"("createdAt");
