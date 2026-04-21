-- H2H-category scoring: cumulative category totals on FantasyStanding.
-- Null for points-mode rows; summed by standingsEngine from
-- TeamWeekResult.categoryBreakdown.matchup.{aWins,bWins,ties}.
ALTER TABLE "standings" ADD COLUMN IF NOT EXISTS "categoryWinsFor" INTEGER DEFAULT 0;
ALTER TABLE "standings" ADD COLUMN IF NOT EXISTS "categoryLossesFor" INTEGER DEFAULT 0;
ALTER TABLE "standings" ADD COLUMN IF NOT EXISTS "categoryTiesFor" INTEGER DEFAULT 0;
