/**
 * PurchaseProcessor — validate and execute purchase; debit wallet and create purchase record.
 */

import { prisma } from '@/lib/prisma'
import { getOrCreateWallet, debitBalance } from './WalletService'
import { getMarketplaceItem } from './MarketplaceService'
import { isSupportedSport } from '@/lib/sport-scope'

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

  if (options?.sport && item.sportRestriction != null && item.sportRestriction !== options.sport) {
    return { success: false, error: 'Item not available for this sport' }
  }

  const wallet = await getOrCreateWallet(managerId)
  if (wallet.currencyBalance < item.price) {
    return { success: false, error: 'Insufficient balance' }
  }

  const newBalance = await debitBalance(managerId, item.price)
  if (newBalance === null) return { success: false, error: 'Insufficient balance' }

  const purchase = await prisma.purchaseRecord.create({
    data: {
      managerId,
      itemId: item.itemId,
      price: item.price,
    },
  })

  return {
    success: true,
    purchaseId: purchase.id,
    newBalance,
  }
}
