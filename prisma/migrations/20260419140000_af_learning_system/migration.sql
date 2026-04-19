-- AllFantasy 3-level AI learning: append-only events + recomputed snapshots (deterministic, auditable).

CREATE TABLE "af_learning_events" (
    "id" TEXT NOT NULL,
    "event_type" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "league_id" VARCHAR(64),
    "user_id" VARCHAR(64),
    "source" VARCHAR(32) NOT NULL DEFAULT 'server',
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "af_learning_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "af_learning_events_sport_created_at_idx" ON "af_learning_events"("sport", "created_at");
CREATE INDEX "af_learning_events_league_id_created_at_idx" ON "af_learning_events"("league_id", "created_at");
CREATE INDEX "af_learning_events_user_id_created_at_idx" ON "af_learning_events"("user_id", "created_at");
CREATE INDEX "af_learning_events_event_type_created_at_idx" ON "af_learning_events"("event_type", "created_at");

CREATE TABLE "af_app_learning_snapshots" (
    "sport" VARCHAR(16) NOT NULL,
    "features" JSONB NOT NULL,
    "explain" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sample_size" INTEGER NOT NULL DEFAULT 0,
    "window_days" INTEGER NOT NULL DEFAULT 90,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "af_app_learning_snapshots_pkey" PRIMARY KEY ("sport")
);

CREATE TABLE "af_league_learning_snapshots" (
    "league_id" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "features" JSONB NOT NULL,
    "explain" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sample_size" INTEGER NOT NULL DEFAULT 0,
    "window_days" INTEGER NOT NULL DEFAULT 90,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "af_league_learning_snapshots_pkey" PRIMARY KEY ("league_id")
);

CREATE INDEX "af_league_learning_snapshots_sport_idx" ON "af_league_learning_snapshots"("sport");

CREATE TABLE "af_user_learning_profiles" (
    "user_id" VARCHAR(64) NOT NULL,
    "features" JSONB NOT NULL,
    "explain" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sample_size" INTEGER NOT NULL DEFAULT 0,
    "window_days" INTEGER NOT NULL DEFAULT 90,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "af_user_learning_profiles_pkey" PRIMARY KEY ("user_id")
);
