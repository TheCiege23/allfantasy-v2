-- User music favorites (TheAudioDB / in-app track bookmarks)
CREATE TABLE IF NOT EXISTS "user_music_favorites" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "trackId" VARCHAR(191) NOT NULL,
  "trackName" VARCHAR(255) NOT NULL,
  "artistName" VARCHAR(255) NOT NULL,
  "trackImage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_music_favorites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_music_favorites_userId_trackId_key"
  ON "user_music_favorites"("userId", "trackId");

CREATE INDEX IF NOT EXISTS "user_music_favorites_userId_createdAt_idx"
  ON "user_music_favorites"("userId", "createdAt");

ALTER TABLE "user_music_favorites"
  ADD CONSTRAINT "user_music_favorites_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "app_users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
