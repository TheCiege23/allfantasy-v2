-- League lifecycle, lock flags, and unified audit_logs for canonical league operations.

CREATE TYPE "LeagueLifecycleState" AS ENUM (
  'setup',
  'pre_draft',
  'drafting',
  'post_draft',
  'in_season',
  'playoffs',
  'completed',
  'archived'
);

ALTER TABLE "leagues"
  ADD COLUMN "lifecycleState" "LeagueLifecycleState" NOT NULL DEFAULT 'in_season',
  ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lifecycleMetadata" JSONB,
  ADD COLUMN "emergencyPaused" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "leagues_lifecycleState_idx" ON "leagues"("lifecycleState");

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT,
    "actionType" VARCHAR(128) NOT NULL,
    "entityType" VARCHAR(64) NOT NULL,
    "entityId" VARCHAR(128),
    "beforeState" JSONB,
    "afterState" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_leagueId_createdAt_idx" ON "audit_logs"("leagueId", "createdAt");
CREATE INDEX "audit_logs_leagueId_actionType_idx" ON "audit_logs"("leagueId", "actionType");

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
