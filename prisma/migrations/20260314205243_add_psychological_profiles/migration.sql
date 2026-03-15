-- CreateTable
CREATE TABLE "manager_psych_profiles" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "profileLabels" JSONB NOT NULL DEFAULT '[]',
    "aggressionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tradeFrequencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waiverFocusScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskToleranceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_psych_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_evidence_records" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "evidenceType" VARCHAR(48) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourceReference" VARCHAR(256),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileId" VARCHAR(64),

    CONSTRAINT "profile_evidence_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "manager_psych_profiles_leagueId_sport_idx" ON "manager_psych_profiles"("leagueId", "sport");

-- CreateIndex
CREATE INDEX "manager_psych_profiles_managerId_idx" ON "manager_psych_profiles"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "manager_psych_profiles_leagueId_managerId_key" ON "manager_psych_profiles"("leagueId", "managerId");

-- CreateIndex
CREATE INDEX "profile_evidence_records_managerId_leagueId_idx" ON "profile_evidence_records"("managerId", "leagueId");

-- CreateIndex
CREATE INDEX "profile_evidence_records_evidenceType_sport_idx" ON "profile_evidence_records"("evidenceType", "sport");

-- AddForeignKey
ALTER TABLE "profile_evidence_records" ADD CONSTRAINT "profile_evidence_records_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "manager_psych_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
