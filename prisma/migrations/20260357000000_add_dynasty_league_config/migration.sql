-- PROMPT 2/5: Dynasty roster, scoring, playoff settings (shared base for standard Dynasty, Devy, C2C).
-- CreateTable
CREATE TABLE "dynasty_league_configs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "regularSeasonWeeks" INTEGER NOT NULL DEFAULT 14,
    "rookiePickOrderMethod" VARCHAR(32) NOT NULL DEFAULT 'max_pf',
    "useMaxPfForNonPlayoff" BOOLEAN NOT NULL DEFAULT true,
    "rookieDraftRounds" INTEGER NOT NULL DEFAULT 4,
    "rookieDraftType" VARCHAR(16) NOT NULL DEFAULT 'linear',
    "divisionsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tradeDeadlineWeek" INTEGER,
    "waiverTypeRecommended" VARCHAR(24) NOT NULL DEFAULT 'faab',
    "futurePicksYearsOut" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dynasty_league_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynasty_draft_order_audit_logs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "configId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "overridePayload" JSONB NOT NULL,
    "userId" VARCHAR(64) NOT NULL,
    "reason" VARCHAR(256),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dynasty_draft_order_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dynasty_league_configs_leagueId_key" ON "dynasty_league_configs"("leagueId");

-- CreateIndex
CREATE INDEX "dynasty_draft_order_audit_logs_leagueId_idx" ON "dynasty_draft_order_audit_logs"("leagueId");

-- CreateIndex
CREATE INDEX "dynasty_draft_order_audit_logs_configId_idx" ON "dynasty_draft_order_audit_logs"("configId");

-- AddForeignKey
ALTER TABLE "dynasty_league_configs" ADD CONSTRAINT "dynasty_league_configs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynasty_draft_order_audit_logs" ADD CONSTRAINT "dynasty_draft_order_audit_logs_configId_fkey" FOREIGN KEY ("configId") REFERENCES "dynasty_league_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
