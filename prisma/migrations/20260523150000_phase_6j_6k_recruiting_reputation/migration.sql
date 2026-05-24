-- Phase 6J: Commissioner Recruiting Pipeline
-- Phase 6K: League Reputation + Commissioner Prestige System
-- Phase 6L: commissionerPrestigeScore denorm on LeagueReputation
--
-- All tables append-only for new data; no existing tables modified except FK back-refs.

-- ── Phase 6J enums ────────────────────────────────────────────────────────────

CREATE TYPE "commissioner_invite_status" AS ENUM (
    'pending',
    'accepted',
    'declined',
    'expired',
    'withdrawn'
);

CREATE TYPE "league_application_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'waitlisted',
    'withdrawn'
);

-- ── Phase 6J: CommissionerCandidateInvite ─────────────────────────────────────

CREATE TABLE "commissioner_candidate_invites" (
    "id"              TEXT                            NOT NULL,
    "leagueId"        VARCHAR(64)                     NOT NULL,
    "commissionerId"  VARCHAR(64)                     NOT NULL,
    "candidateUserId" VARCHAR(64)                     NOT NULL,
    "status"          "commissioner_invite_status"    NOT NULL DEFAULT 'pending',
    "fitScore"        DECIMAL(5,4),
    "fitRationale"    VARCHAR(512),
    "sentAt"          TIMESTAMP(3)                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"       TIMESTAMP(3),
    "respondedAt"     TIMESTAMP(3),
    "updatedAt"       TIMESTAMP(3)                    NOT NULL,

    CONSTRAINT "commissioner_candidate_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commissioner_candidate_invites_leagueId_candidateUserId_key"
    ON "commissioner_candidate_invites"("leagueId", "candidateUserId");
CREATE INDEX "commissioner_candidate_invites_leagueId_commissionerId_idx"
    ON "commissioner_candidate_invites"("leagueId", "commissionerId");
CREATE INDEX "commissioner_candidate_invites_candidateUserId_status_idx"
    ON "commissioner_candidate_invites"("candidateUserId", "status");
CREATE INDEX "commissioner_candidate_invites_sentAt_idx"
    ON "commissioner_candidate_invites"("sentAt");

ALTER TABLE "commissioner_candidate_invites"
    ADD CONSTRAINT "commissioner_candidate_invites_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Phase 6J: LeagueApplication ───────────────────────────────────────────────

CREATE TABLE "league_applications" (
    "id"               TEXT                           NOT NULL,
    "leagueId"         VARCHAR(64)                    NOT NULL,
    "applicantUserId"  VARCHAR(64)                    NOT NULL,
    "status"           "league_application_status"    NOT NULL DEFAULT 'pending',
    "fitSnapshotJson"  JSONB,
    "message"          VARCHAR(1024),
    "commissionerNotes" VARCHAR(1024),
    "reviewedBy"       VARCHAR(64),
    "reviewedAt"       TIMESTAMP(3),
    "submittedAt"      TIMESTAMP(3)                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3)                   NOT NULL,

    CONSTRAINT "league_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "league_applications_leagueId_applicantUserId_key"
    ON "league_applications"("leagueId", "applicantUserId");
CREATE INDEX "league_applications_leagueId_status_idx"
    ON "league_applications"("leagueId", "status");
CREATE INDEX "league_applications_applicantUserId_status_idx"
    ON "league_applications"("applicantUserId", "status");
CREATE INDEX "league_applications_submittedAt_idx"
    ON "league_applications"("submittedAt");

ALTER TABLE "league_applications"
    ADD CONSTRAINT "league_applications_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Phase 6K enums ────────────────────────────────────────────────────────────

CREATE TYPE "league_prestige_tier" AS ENUM (
    'legendary',
    'elite',
    'established',
    'standard',
    'new_league',
    'flagged'
);

CREATE TYPE "commissioner_prestige_tier" AS ENUM (
    'legendary',
    'elite',
    'trusted',
    'standard',
    'new_commissioner',
    'flagged'
);

-- ── Phase 6K: LeagueReputation ────────────────────────────────────────────────

CREATE TABLE "league_reputations" (
    "id"                     TEXT                    NOT NULL,
    "leagueId"               VARCHAR(64)             NOT NULL,
    "completionRate"         DECIMAL(5,4),
    "retentionRate"          DECIMAL(5,4),
    "stabilityScore"         DECIMAL(5,4),
    "longevityScore"         DECIMAL(5,4),
    "competitivenessScore"   DECIMAL(5,4),
    "overallScore"           DECIMAL(5,4),
    "tier"                   "league_prestige_tier"  NOT NULL DEFAULT 'standard',
    "verifiedLeague"         BOOLEAN                 NOT NULL DEFAULT FALSE,
    "totalSeasons"           INTEGER                 NOT NULL DEFAULT 0,
    "abandonedSeasons"       INTEGER                 NOT NULL DEFAULT 0,
    -- Phase 6L: denormalized commissioner prestige score for descriptor loader
    "commissionerPrestigeScore" DECIMAL(5,4),
    "lastComputedAt"         TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3)            NOT NULL,

    CONSTRAINT "league_reputations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "league_reputations_leagueId_key"
    ON "league_reputations"("leagueId");
CREATE INDEX "league_reputations_overallScore_idx"
    ON "league_reputations"("overallScore");
CREATE INDEX "league_reputations_tier_idx"
    ON "league_reputations"("tier");

ALTER TABLE "league_reputations"
    ADD CONSTRAINT "league_reputations_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Phase 6K: CommissionerPrestige ────────────────────────────────────────────

CREATE TABLE "commissioner_prestige" (
    "id"                       TEXT                         NOT NULL,
    "commissionerId"           VARCHAR(64)                  NOT NULL,
    "reliabilityScore"         DECIMAL(5,4),
    "fairnessScore"            DECIMAL(5,4),
    "inviteAcceptanceRate"     DECIMAL(5,4),
    "retentionScore"           DECIMAL(5,4),
    "overallScore"             DECIMAL(5,4),
    "tier"                     "commissioner_prestige_tier" NOT NULL DEFAULT 'standard',
    "verified"                 BOOLEAN                      NOT NULL DEFAULT FALSE,
    "totalLeaguesCommissioned" INTEGER                      NOT NULL DEFAULT 0,
    "totalSeasonsCommissioned" INTEGER                      NOT NULL DEFAULT 0,
    "activeLeagueCount"        INTEGER                      NOT NULL DEFAULT 0,
    "disputeRate"              DECIMAL(5,4),
    "inactivityPenalty"        DECIMAL(5,4),
    "lastComputedAt"           TIMESTAMP(3)                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                TIMESTAMP(3)                 NOT NULL,

    CONSTRAINT "commissioner_prestige_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commissioner_prestige_commissionerId_key"
    ON "commissioner_prestige"("commissionerId");
CREATE INDEX "commissioner_prestige_overallScore_idx"
    ON "commissioner_prestige"("overallScore");
CREATE INDEX "commissioner_prestige_tier_idx"
    ON "commissioner_prestige"("tier");

-- ── Phase 6K: ReputationTelemetryRecord ──────────────────────────────────────

CREATE TABLE "reputation_telemetry" (
    "id"         TEXT         NOT NULL,
    "eventKind"  VARCHAR(64)  NOT NULL,
    "leagueId"   VARCHAR(64),
    "actorId"    VARCHAR(64),
    "targetId"   VARCHAR(64),
    "metadata"   JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_telemetry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reputation_telemetry_leagueId_recordedAt_idx"
    ON "reputation_telemetry"("leagueId", "recordedAt");
CREATE INDEX "reputation_telemetry_actorId_eventKind_idx"
    ON "reputation_telemetry"("actorId", "eventKind");
CREATE INDEX "reputation_telemetry_eventKind_recordedAt_idx"
    ON "reputation_telemetry"("eventKind", "recordedAt");
