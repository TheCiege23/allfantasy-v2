-- AlterTable
ALTER TABLE "leagues" ADD COLUMN     "importBatchId" VARCHAR(64),
ADD COLUMN     "importedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "leagues_importBatchId_idx" ON "leagues"("importBatchId");
