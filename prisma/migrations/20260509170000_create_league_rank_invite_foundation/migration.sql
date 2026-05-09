-- AlterTable
ALTER TABLE "LeagueInvite" ADD COLUMN     "bypassRankGate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdByRole" TEXT;

-- AlterTable
ALTER TABLE "find_league_listings" ADD COLUMN     "creatorRankLevel" INTEGER,
ADD COLUMN     "maxRankLevel" INTEGER,
ADD COLUMN     "minRankLevel" INTEGER;

-- AlterTable
ALTER TABLE "redraft_league_extended_settings" ADD COLUMN     "allowMemberInviteRankBypass" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "LeagueInvite_bypassRankGate_idx" ON "LeagueInvite"("bypassRankGate");

-- CreateIndex
CREATE INDEX "find_league_listings_creatorRankLevel_idx" ON "find_league_listings"("creatorRankLevel");

-- CreateIndex
CREATE INDEX "find_league_listings_minRankLevel_maxRankLevel_idx" ON "find_league_listings"("minRankLevel", "maxRankLevel");