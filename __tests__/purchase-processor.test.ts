import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMarketplaceItemMock = vi.fn()
const getOrCreateWalletMock = vi.fn()
const syncWalletEarningsMock = vi.fn()
const prismaTransactionMock = vi.fn()

vi.mock('@/lib/league-economy/MarketplaceService', () => ({
  getMarketplaceItem: getMarketplaceItemMock,
}))

vi.mock('@/lib/league-economy/WalletService', () => ({
  getOrCreateWallet: getOrCreateWalletMock,
  syncWalletEarnings: syncWalletEarningsMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: prismaTransactionMock,
  },
}))

describe('PurchaseProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects non-cosmetic marketplace items', async () => {
    getMarketplaceItemMock.mockResolvedValue({
      itemId: 'item-1',
      itemType: 'power_up',
      itemName: 'Win Booster',
      description: null,
      price: 10,
      sportRestriction: null,
      cosmeticCategory: 'competitive_boost',
    })

    const { processPurchase } = await import('@/lib/league-economy/PurchaseProcessor')
    const result = await processPurchase('mgr-1', 'item-1')
    expect(result).toEqual({
      success: false,
      error: 'Only cosmetic items can be purchased',
    })
  })

  it('requires matching sport for sport-restricted items', async () => {
    getMarketplaceItemMock.mockResolvedValue({
      itemId: 'item-1',
      itemType: 'cosmetic_profile_frame',
      itemName: 'NHL Frame',
      description: null,
      price: 50,
      sportRestriction: 'NHL',
      cosmeticCategory: 'profile_frame',
    })
    const { processPurchase } = await import('@/lib/league-economy/PurchaseProcessor')

    const missingSport = await processPurchase('mgr-1', 'item-1')
    expect(missingSport).toEqual({
      success: false,
      error: 'Select a supported sport for this item',
    })

    const mismatchedSport = await processPurchase('mgr-1', 'item-1', { sport: 'nba' })
    expect(mismatchedSport).toEqual({
      success: false,
      error: 'Item not available for this sport',
    })
  })

  it('returns insufficient balance when transactional debit fails', async () => {
    getMarketplaceItemMock.mockResolvedValue({
      itemId: 'item-1',
      itemType: 'cosmetic_profile_frame',
      itemName: 'Frame',
      description: null,
      price: 75,
      sportRestriction: null,
      cosmeticCategory: 'profile_frame',
    })
    syncWalletEarningsMock.mockResolvedValue({})
    getOrCreateWalletMock.mockResolvedValue({ currencyBalance: 100 })
    prismaTransactionMock.mockResolvedValue(null)

    const { processPurchase } = await import('@/lib/league-economy/PurchaseProcessor')
    const result = await processPurchase('mgr-1', 'item-1')
    expect(result).toEqual({
      success: false,
      error: 'Insufficient balance',
    })
  })

  it('creates purchase and returns new balance on success', async () => {
    getMarketplaceItemMock.mockResolvedValue({
      itemId: 'item-1',
      itemType: 'cosmetic_profile_frame',
      itemName: 'Frame',
      description: null,
      price: 75,
      sportRestriction: null,
      cosmeticCategory: 'profile_frame',
    })
    syncWalletEarningsMock.mockResolvedValue({})
    getOrCreateWalletMock.mockResolvedValue({ currencyBalance: 200 })
    prismaTransactionMock.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
      return callback({
        managerWallet: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUnique: vi.fn().mockResolvedValue({ currencyBalance: 125 }),
        },
        purchaseRecord: {
          create: vi.fn().mockResolvedValue({ id: 'purchase-1' }),
        },
      })
    })

    const { processPurchase } = await import('@/lib/league-economy/PurchaseProcessor')
    const result = await processPurchase('mgr-1', 'item-1')
    expect(result).toEqual({
      success: true,
      purchaseId: 'purchase-1',
      newBalance: 125,
    })
  })
})
