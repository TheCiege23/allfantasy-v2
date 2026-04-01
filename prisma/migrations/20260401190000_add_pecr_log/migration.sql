-- CreateTable
CREATE TABLE "pecr_logs" (
    "id" TEXT NOT NULL,
    "feature" VARCHAR(64) NOT NULL,
    "intent" VARCHAR(64) NOT NULL,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "context" JSONB,
    "refineHints" JSONB NOT NULL DEFAULT '[]',
    "iterations" INTEGER NOT NULL,
    "maxIterations" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "allFailures" JSONB NOT NULL DEFAULT '[]',
    "durationMs" INTEGER NOT NULL,
    "outputPreview" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pecr_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pecr_logs_feature_idx" ON "pecr_logs"("feature");

-- CreateIndex
CREATE INDEX "pecr_logs_passed_idx" ON "pecr_logs"("passed");

-- CreateIndex
CREATE INDEX "pecr_logs_createdAt_idx" ON "pecr_logs"("createdAt");

-- CreateIndex
CREATE INDEX "pecr_logs_feature_createdAt_idx" ON "pecr_logs"("feature", "createdAt");
