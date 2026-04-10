-- =============================================================================
-- supabase_ensure_lottery_tables.sql
-- Lottery fairness, reveal, and audit tables. Safe to re-run.
-- =============================================================================

-- Lottery audit log (append-only transparency trail)
CREATE TABLE IF NOT EXISTS "lottery_audit_logs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "draftSessionId" TEXT,
  "action" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "actorRole" TEXT DEFAULT 'system',
  "details" TEXT,
  "metadata" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lottery_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lottery_audit_logs_league_idx"
  ON "lottery_audit_logs" ("leagueId");

-- Lottery odds snapshots (frozen odds at time of draw)
CREATE TABLE IF NOT EXISTS "lottery_odds_snapshots" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "draftSessionId" TEXT,
  "rosterId" TEXT NOT NULL,
  "displayName" TEXT,
  "weight" INTEGER DEFAULT 1,
  "oddsPercent" DOUBLE PRECISION DEFAULT 0,
  "eligibilityReason" TEXT,
  "wins" INTEGER DEFAULT 0,
  "losses" INTEGER DEFAULT 0,
  "pointsFor" DOUBLE PRECISION DEFAULT 0,
  "snapshotAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lottery_odds_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lottery_odds_snapshots_league_idx"
  ON "lottery_odds_snapshots" ("leagueId");

-- Lottery draw results (final lottery outcome)
CREATE TABLE IF NOT EXISTS "lottery_draw_results" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "draftSessionId" TEXT,
  "pickSlot" INTEGER NOT NULL,
  "rosterId" TEXT NOT NULL,
  "displayName" TEXT,
  "originalOrder" INTEGER,
  "expectedSlot" INTEGER,
  "movement" INTEGER DEFAULT 0,
  "seed" TEXT,
  "drawNumber" INTEGER DEFAULT 1,
  "isLocked" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lottery_draw_results_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lottery_draw_results_league_idx"
  ON "lottery_draw_results" ("leagueId");

-- Lottery reveal events (tracks reveal flow state)
CREATE TABLE IF NOT EXISTS "lottery_reveal_events" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "draftSessionId" TEXT,
  "eventType" TEXT NOT NULL,
  "pickSlot" INTEGER,
  "rosterId" TEXT,
  "revealMode" TEXT DEFAULT 'step_by_step',
  "triggeredBy" TEXT,
  "metadata" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lottery_reveal_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lottery_reveal_events_league_idx"
  ON "lottery_reveal_events" ("leagueId");

-- Lottery fairness settings (per-league config for transparency features)
CREATE TABLE IF NOT EXISTS "lottery_fairness_settings" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "publicVisibility" BOOLEAN DEFAULT true,
  "showFullAuditLog" BOOLEAN DEFAULT true,
  "showOddsChart" BOOLEAN DEFAULT true,
  "showSimulations" BOOLEAN DEFAULT false,
  "enableAIFairnessSummary" BOOLEAN DEFAULT false,
  "enableManagerAISlotSummary" BOOLEAN DEFAULT false,
  "lockTransparencyAfterReveal" BOOLEAN DEFAULT true,
  "exportAvailable" BOOLEAN DEFAULT true,
  "revealMode" TEXT DEFAULT 'step_by_step',
  "animationSpeed" TEXT DEFAULT 'normal',
  "showMovementIndicator" BOOLEAN DEFAULT true,
  "showOddsOnReveal" BOOLEAN DEFAULT true,
  "allowReplayAfterLock" BOOLEAN DEFAULT true,
  "reducedMotion" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lottery_fairness_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "lottery_fairness_settings_league_key"
  ON "lottery_fairness_settings" ("leagueId");

-- Lottery simulation runs (preview-only, not official)
CREATE TABLE IF NOT EXISTS "lottery_simulation_runs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "simulationCount" INTEGER NOT NULL,
  "results" JSONB NOT NULL DEFAULT '[]',
  "runBy" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lottery_simulation_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lottery_simulation_runs_league_idx"
  ON "lottery_simulation_runs" ("leagueId");
