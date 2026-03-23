import { beforeEach, describe, expect, it, vi } from 'vitest'

const listMarketplaceItemsMock = vi.fn()
const listMarketplaceItemsForSportMock = vi.fn()
const syncWalletEarningsMock = vi.fn()
const processPurchaseMock = vi.fn()
const getInventoryMock = vi.fn()
const getPurchaseHistoryMock = vi.fn()
const resolveAllCosmeticsForManagerMock = vi.fn()
const seedDefaultMarketplaceItemsMock = vi.fn()
const getServerSessionMock = vi.fn()

vi.mock('@/lib/league-economy/MarketplaceService', () => ({
  listMarketplaceItems: listMarketplaceItemsMock,
  listMarketplaceItemsForSport: listMarketplaceItemsForSportMock,
}))

vi.mock('@/lib/league-economy/WalletService', () => ({
  syncWalletEarnings: syncWalletEarningsMock,
}))

vi.mock('@/lib/league-economy/PurchaseProcessor', () => ({
  processPurchase: processPurchaseMock,
}))

vi.mock('@/lib/league-economy/InventoryManager', () => ({
  getInventory: getInventoryMock,
  getPurchaseHistory: getPurchaseHistoryMock,
}))

vi.mock('@/lib/league-economy/CosmeticResolver', () => ({
  resolveAllCosmeticsForManager: resolveAllCosmeticsForManagerMock,
}))

vi.mock('@/lib/league-economy/seedDefaultItems', () => ({
  seedDefaultMarketplaceItems: seedDefaultMarketplaceItemsMock,
}))

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

describe('Marketplace route contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards item list filters and validates inputs', async () => {
    listMarketplaceItemsForSportMock.mockResolvedValue([])
    listMarketplaceItemsMock.mockResolvedValue([])
    const { GET } = await import('@/app/api/marketplace/items/route')

    const filteredReq = new Request(
      'http://localhost/api/marketplace/items?sport=nba&cosmeticCategory=profile_frame&limit=10'
    )
    const filteredRes = await GET(filteredReq)
    expect(filteredRes.status).toBe(200)
    expect(listMarketplaceItemsForSportMock).toHaveBeenCalledWith('NBA', {
      cosmeticCategory: 'profile_frame',
      limit: 10,
    })

    const unfilteredReq = new Request('http://localhost/api/marketplace/items')
    const unfilteredRes = await GET(unfilteredReq)
    expect(unfilteredRes.status).toBe(200)
    expect(listMarketplaceItemsMock).toHaveBeenCalled()

    const invalidSportReq = new Request('http://localhost/api/marketplace/items?sport=bad')
    const invalidSportRes = await GET(invalidSportReq)
    expect(invalidSportRes.status).toBe(400)
    await expect(invalidSportRes.json()).resolves.toEqual({ error: 'Invalid sport' })
  })

  it('requires auth for wallet and returns synced wallet', async () => {
    const { GET } = await import('@/app/api/marketplace/wallet/route')

    getServerSessionMock.mockResolvedValueOnce(null)
    const unauthRes = await GET()
    expect(unauthRes.status).toBe(401)

    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'mgr-1' } })
    syncWalletEarningsMock.mockResolvedValueOnce({
      managerId: 'mgr-1',
      currencyBalance: 300,
      earnedLifetime: 500,
      spentLifetime: 200,
      updatedAt: new Date(),
    })
    const okRes = await GET()
    expect(okRes.status).toBe(200)
    expect(syncWalletEarningsMock).toHaveBeenCalledWith('mgr-1')
  })

  it('normalizes purchase sport and rejects invalid sport', async () => {
    const { POST } = await import('@/app/api/marketplace/purchase/route')

    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'mgr-1' } })
    processPurchaseMock.mockResolvedValueOnce({
      success: true,
      purchaseId: 'p-1',
      newBalance: 120,
    })
    const req = new Request('http://localhost/api/marketplace/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: 'item-1', sport: 'ncaab' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(processPurchaseMock).toHaveBeenCalledWith('mgr-1', 'item-1', {
      sport: 'NCAAB',
    })

    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'mgr-1' } })
    const invalidReq = new Request('http://localhost/api/marketplace/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: 'item-1', sport: 'bad' }),
    })
    const invalidRes = await POST(invalidReq)
    expect(invalidRes.status).toBe(400)
    await expect(invalidRes.json()).resolves.toEqual({ error: 'Invalid sport' })
  })

  it('returns inventory and optional history for authed user', async () => {
    const { GET } = await import('@/app/api/marketplace/inventory/route')
    getServerSessionMock.mockResolvedValue({ user: { id: 'mgr-1' } })
    getInventoryMock.mockResolvedValueOnce([{ itemId: 'item-1', itemName: 'Frame', count: 1 }])
    getPurchaseHistoryMock.mockResolvedValueOnce([{ purchaseId: 'p-1', itemName: 'Frame', price: 10 }])

    const req = new Request('http://localhost/api/marketplace/inventory?history=1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(getInventoryMock).toHaveBeenCalledWith('mgr-1')
    expect(getPurchaseHistoryMock).toHaveBeenCalledWith('mgr-1', { limit: 30 })
  })

  it('supports cosmetics and seed routes for authed user', async () => {
    const cosmeticsRoute = await import('@/app/api/marketplace/cosmetics/route')
    const seedRoute = await import('@/app/api/marketplace/seed/route')
    getServerSessionMock.mockResolvedValue({ user: { id: 'mgr-1' } })
    resolveAllCosmeticsForManagerMock.mockResolvedValueOnce([{ category: 'profile_frame', itemName: 'Gold Frame' }])
    seedDefaultMarketplaceItemsMock.mockResolvedValueOnce(8)

    const cosmeticsRes = await cosmeticsRoute.GET()
    expect(cosmeticsRes.status).toBe(200)
    expect(resolveAllCosmeticsForManagerMock).toHaveBeenCalledWith('mgr-1')

    const seedReq = new Request('http://localhost/api/marketplace/seed', { method: 'POST' })
    const seedRes = await seedRoute.POST(seedReq)
    expect(seedRes.status).toBe(200)
    await expect(seedRes.json()).resolves.toEqual({ seeded: 8 })
  })
})
