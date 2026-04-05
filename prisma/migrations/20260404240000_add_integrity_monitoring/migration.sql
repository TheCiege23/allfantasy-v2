-- Integrity monitoring: collusion / tanking flags (on-field evidence only; no chat)

CREATE TABLE "integrity_flags" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "flagType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "affectedRosterIds" TEXT[] NOT NULL,
    "affectedTeamNames" TEXT[] NOT NULL,
    "summary" TEXT NOT NULL,
    "evidenceJson" JSONB NOT NULL,
    "aiConfidence" DOUBLE PRECISION NOT NULL,
    "tradeTransactionId" TEXT,
    "commissionerNote" TEXT,
    "commissionerUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrity_flags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "league_integrity_settings" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "collusionMonitoringEnabled" BOOLEAN NOT NULL DEFAULT true,
    "collusionSensitivity" TEXT NOT NULL DEFAULT 'medium',
    "tankingMonitorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tankingSensitivity" TEXT NOT NULL DEFAULT 'medium',
    "tankingStartWeek" INTEGER,
    "tankingIllegalLineupCheck" BOOLEAN NOT NULL DEFAULT true,
    "tankingBenchPatternCheck" BOOLEAN NOT NULL DEFAULT true,
    "tankingWaiverPatternCheck" BOOLEAN NOT NULL DEFAULT false,
    "lastCollusionScanAt" TIMESTAMP(3),
    "lastTankingScanAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_integrity_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "league_integrity_settings_leagueId_key" ON "league_integrity_settings"("leagueId");

ALTER TABLE "integrity_flags" ADD CONSTRAINT "integrity_flags_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "league_integrity_settings" ADD CONSTRAINT "league_integrity_settings_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "integrity_flags_leagueId_status_idx" ON "integrity_flags"("leagueId", "status");
CREATE INDEX "integrity_flags_leagueId_flagType_idx" ON "integrity_flags"("leagueId", "flagType");
CREATE INDEX "integrity_flags_createdAt_idx" ON "integrity_flags"("createdAt");
