-- CreateTable
CREATE TABLE "ai_codebase_edits" (
    "id" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "linesAdded" INTEGER NOT NULL DEFAULT 0,
    "linesRemoved" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ai_codebase_edits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_repo_memory" (
    "id" TEXT NOT NULL,
    "memory" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_repo_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_rule_violation_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "feature" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "iteration" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_rule_violation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_custom_rules" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "blockedPattern" TEXT,
    "requiredPattern" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_custom_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_codebase_edits_filePath_idx" ON "ai_codebase_edits"("filePath");
CREATE INDEX "ai_codebase_edits_editedAt_idx" ON "ai_codebase_edits"("editedAt");
CREATE INDEX "ai_repo_memory_id_idx" ON "ai_repo_memory"("id");
CREATE INDEX "ai_rule_violation_logs_userId_idx" ON "ai_rule_violation_logs"("userId");
CREATE INDEX "ai_rule_violation_logs_feature_idx" ON "ai_rule_violation_logs"("feature");
CREATE INDEX "ai_rule_violation_logs_ruleId_idx" ON "ai_rule_violation_logs"("ruleId");
CREATE INDEX "ai_rule_violation_logs_severity_idx" ON "ai_rule_violation_logs"("severity");
CREATE INDEX "ai_rule_violation_logs_createdAt_idx" ON "ai_rule_violation_logs"("createdAt");
CREATE INDEX "ai_custom_rules_enabled_idx" ON "ai_custom_rules"("enabled");
CREATE INDEX "ai_custom_rules_category_idx" ON "ai_custom_rules"("category");
