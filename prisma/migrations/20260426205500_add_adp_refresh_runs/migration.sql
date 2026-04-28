CREATE TABLE IF NOT EXISTS "adp_refresh_runs" (
  "id" TEXT NOT NULL,
  "status" VARCHAR(24) NOT NULL,
  "trigger" VARCHAR(24) NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "duration_ms" INTEGER,
  "sports_processed" JSONB NOT NULL,
  "raw_rows_read" INTEGER NOT NULL DEFAULT 0,
  "raw_rows_inserted" INTEGER NOT NULL DEFAULT 0,
  "raw_rows_skipped" INTEGER NOT NULL DEFAULT 0,
  "consensus_rows_written" INTEGER NOT NULL DEFAULT 0,
  "provider_count_summary" JSONB,
  "quality_summary" JSONB,
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "adp_refresh_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "adp_refresh_runs_status_started_at_idx"
  ON "adp_refresh_runs"("status", "started_at");

CREATE INDEX IF NOT EXISTS "adp_refresh_runs_created_at_idx"
  ON "adp_refresh_runs"("created_at");