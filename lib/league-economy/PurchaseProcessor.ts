/**
 * PurchaseProcessor — validate and execute purchase; debit wallet and create purchase record.
 */

import { prisma } from '@/lib/prisma'
import { getOrCreateWallet, syncWalletEarnings } from './WalletService'
import { getMarketplaceItem } from './MarketplaceService'
import { isSupportedSport, normalizeToSupportedSport } from '@/lib/sport-scope'
import { COSMETIC_CATEGORIES, ITEM_TYPES } from './types'

export interface PurchaseResult {
  success: boolean
  purchaseId?: string
  newBalance?: number
  error?: string
}

/**
 * Process purchase: verify item exists and price, check balance, debit and create record.
 */
export async function processPurchase(
  managerId: string,
  itemId: string,
  options?: { sport?: string | null }
): Promise<PurchaseResult> {
  const item = await getMarketplaceItem(itemId)
  if (!item) return { success: false, error: 'Item not found' }
  const isCosmeticType = (ITEM_TYPES as readonly string[]).includes(item.itemType)
  const isCosmeticCategory = (COSMETIC_CATEGORIES as readonly string[]).includes(item.cosmeticCategory)
  if (!isCosmeticType || !isCosmeticCategory) {
    return { success: false, error: 'Only cosmetic items can be purchased' }
  }
  if (item.price < 0) {
    return { success: false, error: 'Invalid item price' }
  }

  const normalizedSport =
    options?.sport == null
      ? null
      : isSupportedSport(options.sport)
        ? normalizeToSupportedSport(options.sport)
        : null

  if (item.sportRestriction != null) {
    if (normalizedSport == null) {
      return { success: false, error: 'Select a supported sport for this item' }
    }
    if (item.sportRestriction !== normalizedSport) {
      return { success: false, error: 'Item not available for this sport' }
    }
  }

  await syncWalletEarnings(managerId)
  await getOrCreateWallet(managerId)

  const txResult = await prisma.$transaction(async (tx) => {
    if (item.price > 0) {
      const debited = await tx.managerWallet.updateMany({
        where: {
          managerId,
          currencyBalance: { gte: item.price },
        },
        data: {
          currencyBalance: { decrement: item.price },
          spentLifetime: { increment: item.price },
        },
      })
      if (debited.count === 0) return null
    }

    const purchase = await tx.purchaseRecord.create({
      data: {
        managerId,
        itemId: item.itemId,
        price: item.price,
      },
    })
    const wallet = await tx.managerWallet.findUnique({
      where: { managerId },
      select: { currencyBalance: true },
    })
    return {
      purchaseId: purchase.id,
      newBalance: wallet?.currencyBalance ?? 0,
    }
  })
  if (!txResult) return { success: false, error: 'Insufficient balance' }

  return {
    success: true,
    purchaseId: txResult.purchaseId,
    newBalance: txResult.newBalance,
  }
}
