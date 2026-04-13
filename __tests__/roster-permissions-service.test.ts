import { beforeEach, describe, expect, it, vi } from 'vitest'

const leagueFindUniqueMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    league: {
      findUnique: leagueFindUniqueMock,
    },
  },
}))

describe('RosterPermissionsService commissioner enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows commissioner and marks non-read-only', async () => {
    leagueFindUniqueMock.mockResolvedValue({ userId: 'u-1' })
    const { checkCommissionerPermission } = await import('../lib/roster-engine/RosterPermissionsService')

    const permission = await checkCommissionerPermission('u-1', 'league-1')
    expect(permission.isCommissioner).toBe(true)
    expect(permission.readOnly).toBe(false)
    expect(permission.reason).toBeUndefined()
  })

  it('rejects non-commissioner with commissioner-only reason', async () => {
    leagueFindUniqueMock.mockResolvedValue({ userId: 'u-commissioner' })
    const { checkCommissionerPermission, detectReadOnlyRosterView } = await import('../lib/roster-engine/RosterPermissionsService')

    const permission = await checkCommissionerPermission('u-member', 'league-1')
    expect(permission.isCommissioner).toBe(false)
    expect(permission.readOnly).toBe(true)
    expect(permission.reason).toBe('Commissioner only for editing')

    const readOnly = await detectReadOnlyRosterView('u-member', 'league-1')
    expect(readOnly).toBe(true)
  })
})
