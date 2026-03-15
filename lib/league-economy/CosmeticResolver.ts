/**
 * CosmeticResolver — resolve which cosmetic to display for a manager (profile frame, avatar, etc.).
 * Cosmetic-only; never affects competitive balance.
 */

import { getInventory } from './InventoryManager'
import type { CosmeticCategory } from './types'

export interface ResolvedCosmetic {
  category: CosmeticCategory | string
  itemId: string | null
  itemName: string | null
}

/**
 * For a given manager and category, return the first owned item in that category (or null).
 * Future: allow "equipped" slot per category; for now we use first owned.
 */
export async function resolveCosmeticForManager(
  managerId: string,
  category: CosmeticCategory | string
): Promise<ResolvedCosmetic> {
  const inventory = await getInventory(managerId)
  const inCategory = inventory.filter((i) => i.cosmeticCategory === category && i.count > 0)
  const first = inCategory[0]
  return {
    category,
    itemId: first?.itemId ?? null,
    itemName: first?.itemName ?? null,
  }
}

/**
 * Resolve all cosmetic categories for a manager (for profile display).
 */
export async function resolveAllCosmeticsForManager(managerId: string): Promise<ResolvedCosmetic[]> {
  const inventory = await getInventory(managerId)
  const categories = [...new Set(inventory.map((i) => i.cosmeticCategory).filter(Boolean))]
  const result: ResolvedCosmetic[] = []
  for (const cat of categories) {
    const first = inventory.find((i) => i.cosmeticCategory === cat && i.count > 0)
    result.push({
      category: cat,
      itemId: first?.itemId ?? null,
      itemName: first?.itemName ?? null,
    })
  }
  return result
}
