-- CreateTable
CREATE TABLE IF NOT EXISTS "podcast_episodes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(256) NOT NULL,
    "script" TEXT NOT NULL,
    "audioUrl" VARCHAR(1024),
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "podcast_episodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "podcast_episodes_userId_idx" ON "podcast_episodes"("userId");
CREATE INDEX IF NOT EXISTS "podcast_episodes_userId_createdAt_idx" ON "podcast_episodes"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "podcast_episodes" ADD CONSTRAINT "podcast_episodes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
