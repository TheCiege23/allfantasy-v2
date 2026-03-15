-- CreateTable
CREATE TABLE "manager_reputation_records" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reliabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tradeFairnessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sportsmanshipScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionerTrustScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "toxicityRiskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "participationQualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responsivenessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tier" VARCHAR(32) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_reputation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputation_evidence_records" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "evidenceType" VARCHAR(64) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourceReference" VARCHAR(256),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_evidence_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "manager_reputation_records_leagueId_sport_idx" ON "manager_reputation_records"("leagueId", "sport");

-- CreateIndex
CREATE INDEX "manager_reputation_records_managerId_idx" ON "manager_reputation_records"("managerId");

-- CreateIndex
CREATE INDEX "manager_reputation_records_tier_idx" ON "manager_reputation_records"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "manager_reputation_records_leagueId_managerId_key" ON "manager_reputation_records"("leagueId", "managerId");

-- CreateIndex
CREATE INDEX "reputation_evidence_records_managerId_leagueId_idx" ON "reputation_evidence_records"("managerId", "leagueId");

-- CreateIndex
CREATE INDEX "reputation_evidence_records_leagueId_evidenceType_idx" ON "reputation_evidence_records"("leagueId", "evidenceType");

-- CreateIndex
CREATE INDEX "reputation_evidence_records_sport_evidenceType_idx" ON "reputation_evidence_records"("sport", "evidenceType");
