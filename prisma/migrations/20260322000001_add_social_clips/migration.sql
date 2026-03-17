-- CreateTable
CREATE TABLE "social_clips" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clipType" VARCHAR(64) NOT NULL,
    "title" VARCHAR(256) NOT NULL,
    "subtitle" VARCHAR(512),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_clips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_clips_userId_idx" ON "social_clips"("userId");

-- CreateIndex
CREATE INDEX "social_clips_userId_createdAt_idx" ON "social_clips"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "social_clips" ADD CONSTRAINT "social_clips_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
