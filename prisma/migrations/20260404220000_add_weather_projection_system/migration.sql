-- Weather cache + AF projection snapshots (applied via `prisma db push` in dev; use `migrate deploy` where migrations are source of truth).

CREATE TABLE IF NOT EXISTS "WeatherCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "forecastForTime" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "temperatureF" DOUBLE PRECISION,
    "feelsLikeF" DOUBLE PRECISION,
    "windSpeedMph" DOUBLE PRECISION,
    "windGustsMph" DOUBLE PRECISION,
    "windDirectionDeg" DOUBLE PRECISION,
    "precipChancePct" DOUBLE PRECISION,
    "rainInches" DOUBLE PRECISION,
    "snowInches" DOUBLE PRECISION,
    "humidityPct" DOUBLE PRECISION,
    "visibilityMiles" DOUBLE PRECISION,
    "conditionCode" TEXT,
    "conditionLabel" TEXT,
    "cloudCoverPct" DOUBLE PRECISION,
    "isIndoor" BOOLEAN NOT NULL DEFAULT false,
    "isDome" BOOLEAN NOT NULL DEFAULT false,
    "roofClosed" BOOLEAN NOT NULL DEFAULT false,
    "sport" TEXT,
    "eventId" TEXT,
    "dataSource" TEXT NOT NULL DEFAULT 'openweathermap',
    "apiResponseRaw" JSONB,

    CONSTRAINT "WeatherCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WeatherCache_cacheKey_key" ON "WeatherCache"("cacheKey");
CREATE INDEX IF NOT EXISTS "WeatherCache_cacheKey_idx" ON "WeatherCache"("cacheKey");
CREATE INDEX IF NOT EXISTS "WeatherCache_fetchedAt_idx" ON "WeatherCache"("fetchedAt");
CREATE INDEX IF NOT EXISTS "WeatherCache_forecastForTime_idx" ON "WeatherCache"("forecastForTime");

CREATE TABLE IF NOT EXISTS "AFProjectionSnapshot" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "week" INTEGER,
    "season" INTEGER NOT NULL,
    "eventId" TEXT,
    "baselineProjection" DOUBLE PRECISION NOT NULL,
    "weatherAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "afProjection" DOUBLE PRECISION NOT NULL,
    "weatherCacheId" TEXT,
    "adjustmentFactors" JSONB,
    "adjustmentReason" TEXT,
    "confidenceLevel" TEXT NOT NULL DEFAULT 'medium',
    "isOutdoorGame" BOOLEAN NOT NULL DEFAULT true,
    "venueOverride" BOOLEAN NOT NULL DEFAULT false,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "snapshotLookupKey" TEXT NOT NULL,

    CONSTRAINT "AFProjectionSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AFProjectionSnapshot_snapshotLookupKey_key" ON "AFProjectionSnapshot"("snapshotLookupKey");
CREATE INDEX IF NOT EXISTS "AFProjectionSnapshot_playerId_week_season_idx" ON "AFProjectionSnapshot"("playerId", "week", "season");
CREATE INDEX IF NOT EXISTS "AFProjectionSnapshot_sport_week_season_idx" ON "AFProjectionSnapshot"("sport", "week", "season");
