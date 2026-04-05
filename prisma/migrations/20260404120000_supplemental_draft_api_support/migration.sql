-- Find-a-league listings for advertised orphan slots; roster settings JSON for advertise/AI flags.
CREATE TABLE "find_league_listings" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "headline" VARCHAR(256) NOT NULL DEFAULT '',
    "body" TEXT,
    "sport" "LeagueSport" NOT NULL DEFAULT 'NFL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "find_league_listings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "find_league_listings_leagueId_rosterId_key" ON "find_league_listings"("leagueId", "rosterId");
CREATE INDEX "find_league_listings_isActive_sport_createdAt_idx" ON "find_league_listings"("isActive", "sport", "createdAt");

ALTER TABLE "find_league_listings" ADD CONSTRAINT "find_league_listings_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rosters" ADD COLUMN "settings" JSONB;
