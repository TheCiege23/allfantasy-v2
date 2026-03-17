-- CreateTable
CREATE TABLE "league_templates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "league_templates_userId_idx" ON "league_templates"("userId");

-- AddForeignKey
ALTER TABLE "league_templates" ADD CONSTRAINT "league_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
