-- AlterTable
ALTER TABLE "strategy_meta_reports"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "strategy_meta_reports_updatedAt_idx" ON "strategy_meta_reports"("updatedAt");
