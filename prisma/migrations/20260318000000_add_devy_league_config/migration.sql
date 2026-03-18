-- CreateTable: Devy Dynasty league config (PROMPT 2/6).
CREATE TABLE "devy_league_configs" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "dynastyOnly" BOOLEAN NOT NULL DEFAULT true,
    "supportsStartupVetDraft" BOOLEAN NOT NULL DEFAULT true,
    "supportsRookieDraft" BOOLEAN NOT NULL DEFAULT true,
    "supportsDevyDraft" BOOLEAN NOT NULL DEFAULT true,
    "supportsBestBall" BOOLEAN NOT NULL DEFAULT true,
    "supportsSnakeDraft" BOOLEAN NOT NULL DEFAULT true,
    "supportsLinearDraft" BOOLEAN NOT NULL DEFAULT true,
    "supportsTaxi" BOOLEAN NOT NULL DEFAULT true,
    "supportsFuturePicks" BOOLEAN NOT NULL DEFAULT true,
    "supportsTradeableDevyPicks" BOOLEAN NOT NULL DEFAULT true,
    "supportsTradeableRookiePicks" BOOLEAN NOT NULL DEFAULT true,
    "devySlotCount" INTEGER NOT NULL DEFAULT 6,
    "taxiSize" INTEGER NOT NULL DEFAULT 6,
    "rookieDraftRounds" INTEGER NOT NULL DEFAULT 4,
    "devyDraftRounds" INTEGER NOT NULL DEFAULT 4,
    "startupVetRounds" INTEGER,
    "bestBallEnabled" BOOLEAN NOT NULL DEFAULT false,
    "startupDraftType" VARCHAR(16) NOT NULL DEFAULT 'snake',
    "rookieDraftType" VARCHAR(16) NOT NULL DEFAULT 'snake',
    "devyDraftType" VARCHAR(16) NOT NULL DEFAULT 'snake',
    "maxYearlyDevyPromotions" INTEGER,
    "earlyDeclareBehavior" VARCHAR(24) NOT NULL DEFAULT 'allow',
    "rookiePickOrderMethod" VARCHAR(32) NOT NULL DEFAULT 'reverse_standings',
    "devyPickOrderMethod" VARCHAR(32) NOT NULL DEFAULT 'reverse_standings',
    "devyPickTradeRules" VARCHAR(24) NOT NULL DEFAULT 'allowed',
    "rookiePickTradeRules" VARCHAR(24) NOT NULL DEFAULT 'allowed',
    "nflDevyExcludeKDST" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devy_league_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "devy_league_configs_leagueId_key" ON "devy_league_configs"("leagueId");

ALTER TABLE "devy_league_configs" ADD CONSTRAINT "devy_league_configs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
