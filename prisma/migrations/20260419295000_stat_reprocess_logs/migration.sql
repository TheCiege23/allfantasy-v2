CREATE TABLE "stat_reprocess_logs" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(256) NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stat_reprocess_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stat_reprocess_logs_key_key" ON "stat_reprocess_logs"("key");
CREATE INDEX "stat_reprocess_logs_leagueId_season_week_idx" ON "stat_reprocess_logs"("leagueId", "season", "week");

ALTER TABLE "stat_reprocess_logs" ADD CONSTRAINT "stat_reprocess_logs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
