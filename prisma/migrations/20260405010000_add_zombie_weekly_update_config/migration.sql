-- AlterTable
ALTER TABLE "zombie_leagues" ADD COLUMN "weeklyUpdateDay" INTEGER,
ADD COLUMN "weeklyUpdateHour" INTEGER,
ADD COLUMN "weeklyUpdateAutoPost" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "weeklyUpdateApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "updateIncludeProjections" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "updateIncludeMoney" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "updateIncludeInventory" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "updateIncludeUniverse" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "updateIncludeDanger" BOOLEAN NOT NULL DEFAULT true;
