/**
 * InventoryManager — list purchased items per manager (inventory); aggregate by item for count.
 */

import { prisma } from '@/lib/prisma'
import { COSMETIC_CATEGORY_LABELS } from './types'
import type { CosmeticCategory, InventoryItemView, PurchaseRecordView } from './types'

export async function getInventory(managerId: string): Promise<InventoryItemView[]> {
  const purchases = await prisma.purchaseRecord.findMany({
    where: { managerId },
    orderBy: { createdAt: 'desc' },
  })
  const itemIds = [...new Set(purchases.map((p) => p.itemId))]
  const items = await prisma.marketplaceItem.findMany({
    where: { id: { in: itemIds } },
  })
  const nameByItemId = new Map(items.map((i) => [i.id, i.itemName]))
  const categoryByItemId = new Map(items.map((i) => [i.id, i.cosmeticCategory]))

  const countByItem = new Map<string, number>()
  for (const p of purchases) {
    countByItem.set(p.itemId, (countByItem.get(p.itemId) ?? 0) + 1)
  }

  return Array.from(countByItem.entries()).map(([itemId, count]) => ({
    itemId,
    itemName: nameByItemId.get(itemId) ?? 'Unknown',
    cosmeticCategory: categoryByItemId.get(itemId) ?? 'unknown',
    cosmeticCategoryLabel: COSMETIC_CATEGORY_LABELS[categoryByItemId.get(itemId) as CosmeticCategory] ?? 'Other',
    count,
  }))
}

export async function getPurchaseHistory(
  managerId: string,
  options?: { limit?: number }
): Promise<PurchaseRecordView[]> {
  const limit = Math.min(options?.limit ?? 50, 100)
  const purchases = await prisma.purchaseRecord.findMany({
    where: { managerId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  const itemIds = [...new Set(purchases.map((p) => p.itemId))]
  const items = await prisma.marketplaceItem.findMany({
    where: { id: { in: itemIds } },
  })
  const nameByItemId = new Map(items.map((i) => [i.id, i.itemName]))

  return purchases.map((p) => ({
    purchaseId: p.id,
    managerId: p.managerId,
    itemId: p.itemId,
    itemName: nameByItemId.get(p.itemId) ?? 'Unknown',
    price: p.price,
    createdAt: p.createdAt,
  }))
}
