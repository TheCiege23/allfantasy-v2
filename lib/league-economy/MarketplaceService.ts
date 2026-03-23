/**
 * MarketplaceService — list and get marketplace items; filter by sport and category.
 */

import { prisma } from '@/lib/prisma'
import { COSMETIC_CATEGORY_LABELS } from './types'
import type { CosmeticCategory, MarketplaceItemView } from './types'
import { isSupportedSport } from '@/lib/sport-scope'

export async function listMarketplaceItems(options?: {
  sport?: string | null
  cosmeticCategory?: string | null
  limit?: number
}): Promise<MarketplaceItemView[]> {
  const where: {
    OR?: Array<{ sportRestriction: string | null }>
    cosmeticCategory?: string
  } = {}
  if (options?.sport && isSupportedSport(options.sport)) {
    where.OR = [{ sportRestriction: null }, { sportRestriction: options.sport }]
  }
  if (options?.cosmeticCategory) {
    where.cosmeticCategory = options.cosmeticCategory
  }
  const limit = Math.min(options?.limit ?? 100, 200)
  const items = await prisma.marketplaceItem.findMany({
    where,
    orderBy: [{ cosmeticCategory: 'asc' }, { price: 'asc' }],
    take: limit,
  })
  return items.map((i) => ({
    itemId: i.id,
    itemType: i.itemType,
    itemName: i.itemName,
    description: i.description,
    price: i.price,
    sportRestriction: i.sportRestriction,
    cosmeticCategory: i.cosmeticCategory,
    cosmeticCategoryLabel: COSMETIC_CATEGORY_LABELS[i.cosmeticCategory as CosmeticCategory] ?? i.cosmeticCategory,
    createdAt: i.createdAt,
  }))
}

/** Items available for a sport: either no restriction or sportRestriction = sport. */
export async function listMarketplaceItemsForSport(
  sport: string,
  options?: { cosmeticCategory?: string | null; limit?: number }
): Promise<MarketplaceItemView[]> {
  const items = await prisma.marketplaceItem.findMany({
    where: {
      OR: [{ sportRestriction: null }, { sportRestriction: sport }],
      ...(options?.cosmeticCategory ? { cosmeticCategory: options.cosmeticCategory } : {}),
    },
    orderBy: [{ cosmeticCategory: 'asc' }, { price: 'asc' }],
    take: Math.min(options?.limit ?? 100, 200),
  })
  return items.map((i) => ({
    itemId: i.id,
    itemType: i.itemType,
    itemName: i.itemName,
    description: i.description,
    price: i.price,
    sportRestriction: i.sportRestriction,
    cosmeticCategory: i.cosmeticCategory,
    cosmeticCategoryLabel: COSMETIC_CATEGORY_LABELS[i.cosmeticCategory as CosmeticCategory] ?? i.cosmeticCategory,
    createdAt: i.createdAt,
  }))
}

export async function getMarketplaceItem(itemId: string): Promise<MarketplaceItemView | null> {
  const i = await prisma.marketplaceItem.findUnique({
    where: { id: itemId },
  })
  if (!i) return null
  return {
    itemId: i.id,
    itemType: i.itemType,
    itemName: i.itemName,
    description: i.description,
    price: i.price,
    sportRestriction: i.sportRestriction,
    cosmeticCategory: i.cosmeticCategory,
    cosmeticCategoryLabel: COSMETIC_CATEGORY_LABELS[i.cosmeticCategory as CosmeticCategory] ?? i.cosmeticCategory,
    createdAt: i.createdAt,
  }
}
