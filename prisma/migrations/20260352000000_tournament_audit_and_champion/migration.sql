-- PROMPT 5: Tournament audit log and champion/lock fields
CREATE TABLE IF NOT EXISTS "tournament_audit_logs" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" VARCHAR(48) NOT NULL,
    "targetType" VARCHAR(24),
    "targetId" VARCHAR(128),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "tournament_audit_logs_tournamentId_idx" ON "tournament_audit_logs"("tournamentId");
CREATE INDEX IF NOT EXISTS "tournament_audit_logs_tournamentId_createdAt_idx" ON "tournament_audit_logs"("tournamentId", "createdAt");

ALTER TABLE "tournament_audit_logs" ADD CONSTRAINT "tournament_audit_logs_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add champion and lock columns to tournaments
ALTER TABLE "tournaments" ADD COLUMN "championUserId" VARCHAR(64);
ALTER TABLE "tournaments" ADD COLUMN "lockedAt" TIMESTAMP(3);
