ALTER TABLE "waiver_claims"
ADD COLUMN IF NOT EXISTS "sportType" VARCHAR(16);

ALTER TABLE "waiver_transactions"
ADD COLUMN IF NOT EXISTS "sportType" VARCHAR(16);

ALTER TABLE "draft_sessions"
ADD COLUMN IF NOT EXISTS "sportType" VARCHAR(16);

ALTER TABLE "draft_picks"
ADD COLUMN IF NOT EXISTS "sportType" VARCHAR(16);

UPDATE "waiver_claims" wc
SET "sportType" = l."sport"::text
FROM "leagues" l
WHERE wc."leagueId" = l."id"
  AND wc."sportType" IS NULL;

UPDATE "waiver_transactions" wt
SET "sportType" = l."sport"::text
FROM "leagues" l
WHERE wt."leagueId" = l."id"
  AND wt."sportType" IS NULL;

UPDATE "draft_sessions" ds
SET "sportType" = l."sport"::text
FROM "leagues" l
WHERE ds."leagueId" = l."id"
  AND ds."sportType" IS NULL;

UPDATE "draft_picks" dp
SET "sportType" = ds."sportType"
FROM "draft_sessions" ds
WHERE dp."sessionId" = ds."id"
  AND dp."sportType" IS NULL;

CREATE INDEX IF NOT EXISTS "waiver_claims_leagueId_sportType_idx"
  ON "waiver_claims" ("leagueId", "sportType");

CREATE INDEX IF NOT EXISTS "waiver_claims_sportType_status_idx"
  ON "waiver_claims" ("sportType", "status");

CREATE INDEX IF NOT EXISTS "waiver_transactions_leagueId_sportType_idx"
  ON "waiver_transactions" ("leagueId", "sportType");

CREATE INDEX IF NOT EXISTS "waiver_transactions_sportType_processedAt_idx"
  ON "waiver_transactions" ("sportType", "processedAt");

CREATE INDEX IF NOT EXISTS "draft_sessions_leagueId_sportType_idx"
  ON "draft_sessions" ("leagueId", "sportType");

CREATE INDEX IF NOT EXISTS "draft_sessions_sportType_status_idx"
  ON "draft_sessions" ("sportType", "status");

CREATE INDEX IF NOT EXISTS "draft_picks_sessionId_sportType_idx"
  ON "draft_picks" ("sessionId", "sportType");

CREATE INDEX IF NOT EXISTS "draft_picks_sportType_idx"
  ON "draft_picks" ("sportType");
