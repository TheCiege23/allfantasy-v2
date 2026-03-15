-- CreateTable
CREATE TABLE "manager_wallets" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "currencyBalance" INTEGER NOT NULL DEFAULT 0,
    "earnedLifetime" INTEGER NOT NULL DEFAULT 0,
    "spentLifetime" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_items" (
    "id" TEXT NOT NULL,
    "itemType" VARCHAR(64) NOT NULL,
    "itemName" VARCHAR(128) NOT NULL,
    "description" VARCHAR(512),
    "price" INTEGER NOT NULL DEFAULT 0,
    "sportRestriction" VARCHAR(16),
    "cosmeticCategory" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_records" (
    "id" TEXT NOT NULL,
    "managerId" VARCHAR(128) NOT NULL,
    "itemId" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manager_wallets_managerId_key" ON "manager_wallets"("managerId");

-- CreateIndex
CREATE INDEX "marketplace_items_cosmeticCategory_idx" ON "marketplace_items"("cosmeticCategory");

-- CreateIndex
CREATE INDEX "marketplace_items_sportRestriction_idx" ON "marketplace_items"("sportRestriction");

-- CreateIndex
CREATE INDEX "purchase_records_managerId_idx" ON "purchase_records"("managerId");

-- CreateIndex
CREATE INDEX "purchase_records_itemId_idx" ON "purchase_records"("itemId");
