-- AddAudioMetadata Migration
-- Creates audio_metadata table to store TheAudioDB artist info mapped from player names.

-- Create table
CREATE TABLE IF NOT EXISTS audio_metadata (
  id TEXT PRIMARY KEY,
  player_name VARCHAR(255) NOT NULL,
  sport VARCHAR(16) NOT NULL,
  artist_id VARCHAR(128) NOT NULL,
  artist_name VARCHAR(255) NOT NULL,
  biography TEXT,
  image_url TEXT,
  website TEXT,
  country_code VARCHAR(2),
  genres TEXT[] DEFAULT '{}',
  album_name VARCHAR(255),
  album_year INTEGER,
  album_cover TEXT,
  source VARCHAR(32) DEFAULT 'theaudiodb',
  confidence REAL DEFAULT 0.5,
  last_synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(player_name, sport)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS audio_metadata_sport_idx ON audio_metadata(sport);
CREATE INDEX IF NOT EXISTS audio_metadata_last_synced_idx ON audio_metadata(last_synced_at);
