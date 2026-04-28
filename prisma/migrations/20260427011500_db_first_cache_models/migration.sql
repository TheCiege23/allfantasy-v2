CREATE TABLE IF NOT EXISTS "draft_pool_cache" (
  "id" TEXT NOT NULL,
  "league_id" VARCHAR(64) NOT NULL,
  "cache_key" VARCHAR(191) NOT NULL,
  "sport" VARCHAR(16),
  "pool_type" VARCHAR(32),
  "source_fingerprint" VARCHAR(191),
  "entry_count" INTEGER NOT NULL DEFAULT 0,
  "payload" JSONB NOT NULL,
  "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "draft_pool_cache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "draft_pool_cache_cache_key_key"
  ON "draft_pool_cache"("cache_key");

CREATE INDEX IF NOT EXISTS "draft_pool_cache_league_id_synced_at_idx"
  ON "draft_pool_cache"("league_id", "synced_at");

CREATE INDEX IF NOT EXISTS "draft_pool_cache_expires_at_idx"
  ON "draft_pool_cache"("expires_at");

CREATE TABLE IF NOT EXISTS "ai_results" (
  "id" TEXT NOT NULL,
  "result_key" VARCHAR(191) NOT NULL,
  "input_hash" VARCHAR(191) NOT NULL,
  "feature" VARCHAR(64) NOT NULL,
  "scope_type" VARCHAR(32),
  "scope_id" VARCHAR(128),
  "provider" VARCHAR(64),
  "model" VARCHAR(128),
  "status" VARCHAR(24) NOT NULL DEFAULT 'ready',
  "input_json" JSONB,
  "result_text" TEXT,
  "result_json" JSONB,
  "token_prompt" INTEGER,
  "token_output" INTEGER,
  "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_results_result_key_key"
  ON "ai_results"("result_key");

CREATE INDEX IF NOT EXISTS "ai_results_feature_synced_at_idx"
  ON "ai_results"("feature", "synced_at");

CREATE INDEX IF NOT EXISTS "ai_results_scope_type_scope_id_idx"
  ON "ai_results"("scope_type", "scope_id");

CREATE INDEX IF NOT EXISTS "ai_results_input_hash_idx"
  ON "ai_results"("input_hash");

CREATE INDEX IF NOT EXISTS "ai_results_expires_at_idx"
  ON "ai_results"("expires_at");

CREATE TABLE IF NOT EXISTS "sync_job_runs" (
  "id" TEXT NOT NULL,
  "job_name" VARCHAR(64) NOT NULL,
  "job_scope" VARCHAR(64),
  "trigger" VARCHAR(24) NOT NULL DEFAULT 'system',
  "status" VARCHAR(24) NOT NULL DEFAULT 'running',
  "rows_read" INTEGER NOT NULL DEFAULT 0,
  "rows_written" INTEGER NOT NULL DEFAULT 0,
  "rows_skipped" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "error_message" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "duration_ms" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sync_job_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "sync_job_runs_job_name_started_at_idx"
  ON "sync_job_runs"("job_name", "started_at");

CREATE INDEX IF NOT EXISTS "sync_job_runs_status_started_at_idx"
  ON "sync_job_runs"("status", "started_at");

CREATE INDEX IF NOT EXISTS "sync_job_runs_created_at_idx"
  ON "sync_job_runs"("created_at");
