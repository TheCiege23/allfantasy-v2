-- CreateTable: audio_metadata
-- Maps TheAudioDB artist/album info from player names for the music-interests feature.
-- Uses CREATE TABLE IF NOT EXISTS so this migration is safe to re-run if the table
-- was previously created manually (the loose add_audio_metadata_table.sql).

CREATE TABLE IF NOT EXISTS "audio_metadata" (
    "id" TEXT NOT NULL,
    "player_name" VARCHAR(255) NOT NULL,
    "sport" VARCHAR(16) NOT NULL,
    "artist_id" VARCHAR(128) NOT NULL,
    "artist_name" VARCHAR(255) NOT NULL,
    "biography" TEXT,
    "image_url" TEXT,
    "website" TEXT,
    "country_code" VARCHAR(2),
    "genres" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "album_name" VARCHAR(255),
    "album_year" INTEGER,
    "album_cover" TEXT,
    "source" VARCHAR(32) NOT NULL DEFAULT 'theaudiodb',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_audio_metadata_player_sport" ON "audio_metadata"("player_name", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audio_metadata_sport_idx" ON "audio_metadata"("sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audio_metadata_last_synced_idx" ON "audio_metadata"("last_synced_at");
