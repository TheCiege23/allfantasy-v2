-- CreateTable: creator profiles (verified creators / influencers who host leagues)
CREATE TABLE "creator_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "creator_profiles_userId_key" ON "creator_profiles"("userId");
CREATE UNIQUE INDEX "creator_profiles_handle_key" ON "creator_profiles"("handle");
CREATE INDEX "creator_profiles_handle_idx" ON "creator_profiles"("handle");

ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
