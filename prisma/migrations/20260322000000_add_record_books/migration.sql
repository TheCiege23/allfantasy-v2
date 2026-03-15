-- CreateTable
CREATE TABLE "record_book_entries" (
    "id" TEXT NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "recordType" VARCHAR(64) NOT NULL,
    "holderId" VARCHAR(128) NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "season" VARCHAR(16) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_book_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "record_book_entries_leagueId_recordType_season_key" ON "record_book_entries"("leagueId", "recordType", "season");

-- CreateIndex
CREATE INDEX "record_book_entries_leagueId_recordType_idx" ON "record_book_entries"("leagueId", "recordType");

-- CreateIndex
CREATE INDEX "record_book_entries_sport_recordType_idx" ON "record_book_entries"("sport", "recordType");

-- CreateIndex
CREATE INDEX "record_book_entries_holderId_idx" ON "record_book_entries"("holderId");
