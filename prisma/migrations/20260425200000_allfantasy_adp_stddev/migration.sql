-- D.5: add standardDeviation column to allfantasy_adp_snapshots.
ALTER TABLE "allfantasy_adp_snapshots"
  ADD COLUMN IF NOT EXISTS "standardDeviation" DOUBLE PRECISION;
