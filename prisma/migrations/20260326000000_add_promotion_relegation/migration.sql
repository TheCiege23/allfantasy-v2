-- CreateTable
CREATE TABLE "league_divisions" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "tierLevel" INTEGER NOT NULL DEFAULT 1,
    "sport" VARCHAR(16) NOT NULL,
    "name" VARCHAR(128),

    CONSTRAINT "league_divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_rules" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "fromTierLevel" INTEGER NOT NULL DEFAULT 1,
    "toTierLevel" INTEGER NOT NULL DEFAULT 2,
    "promoteCount" INTEGER NOT NULL DEFAULT 1,
    "relegateCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "promotion_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "league_divisions_leagueId_tierLevel_key" ON "league_divisions"("leagueId", "tierLevel");

-- CreateIndex
CREATE INDEX "league_divisions_leagueId_idx" ON "league_divisions"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_rules_leagueId_fromTierLevel_toTierLevel_key" ON "promotion_rules"("leagueId", "fromTierLevel", "toTierLevel");

-- CreateIndex
CREATE INDEX "promotion_rules_leagueId_idx" ON "promotion_rules"("leagueId");

-- AlterTable: add divisionId to league_teams
ALTER TABLE "league_teams" ADD COLUMN "divisionId" VARCHAR(64);

-- CreateIndex
CREATE INDEX "league_teams_divisionId_idx" ON "league_teams"("divisionId");

-- AddForeignKey
ALTER TABLE "league_divisions" ADD CONSTRAINT "league_divisions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "league_teams" ADD CONSTRAINT "league_teams_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "league_divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
