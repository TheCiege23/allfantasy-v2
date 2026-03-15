-- CreateTable
CREATE TABLE "legacy_score_records" (
    "id" TEXT NOT NULL,
    "entityType" VARCHAR(32) NOT NULL,
    "entityId" VARCHAR(128) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "leagueId" VARCHAR(64),
    "overallLegacyScore" DECIMAL(10,4) NOT NULL,
    "championshipScore" DECIMAL(10,4) NOT NULL,
    "playoffScore" DECIMAL(10,4) NOT NULL,
    "consistencyScore" DECIMAL(10,4) NOT NULL,
    "rivalryScore" DECIMAL(10,4) NOT NULL,
    "awardsScore" DECIMAL(10,4) NOT NULL,
    "dynastyScore" DECIMAL(10,4) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legacy_score_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legacy_evidence_records" (
    "id" TEXT NOT NULL,
    "entityType" VARCHAR(32) NOT NULL,
    "entityId" VARCHAR(128) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "evidenceType" VARCHAR(64) NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "sourceReference" VARCHAR(256),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legacy_evidence_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "legacy_score_records_entityType_entityId_sport_leagueId_key" ON "legacy_score_records"("entityType", "entityId", "sport", "leagueId");

-- CreateIndex
CREATE INDEX "legacy_score_records_sport_leagueId_idx" ON "legacy_score_records"("sport", "leagueId");

-- CreateIndex
CREATE INDEX "legacy_score_records_entityType_entityId_idx" ON "legacy_score_records"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "legacy_score_records_overallLegacyScore_idx" ON "legacy_score_records"("overallLegacyScore");

-- CreateIndex
CREATE INDEX "legacy_evidence_records_entityType_entityId_sport_idx" ON "legacy_evidence_records"("entityType", "entityId", "sport");

-- CreateIndex
CREATE INDEX "legacy_evidence_records_sport_evidenceType_idx" ON "legacy_evidence_records"("sport", "evidenceType");
