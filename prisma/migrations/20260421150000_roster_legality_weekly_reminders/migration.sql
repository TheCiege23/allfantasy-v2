-- Weekly dedupe for illegal roster in-app reminders (one row per roster/week after notify).
CREATE TABLE "roster_legality_weekly_reminders" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "issueHash" VARCHAR(128) NOT NULL,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roster_legality_weekly_reminders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roster_legality_weekly_reminders_rosterId_season_week_key" ON "roster_legality_weekly_reminders"("rosterId", "season", "week");
CREATE INDEX "roster_legality_weekly_reminders_leagueId_week_idx" ON "roster_legality_weekly_reminders"("leagueId", "week");
