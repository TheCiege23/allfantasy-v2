-- Hot-path roster lists ordered by recency (lineup churn, waiver polling).
CREATE INDEX IF NOT EXISTS "rosters_leagueId_updatedAt_idx" ON "rosters" ("leagueId", "updatedAt");
