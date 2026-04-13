import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextRequest } from '@/__tests__/helpers/createMockNextRequest'

const getServerSessionMock = vi.fn()
const validateActionExecutionServerSideMock = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/chimmy-actions/AIActionServerValidation', () => ({
  validateActionExecutionServerSide: validateActionExecutionServerSideMock,
}))

function buildPayload() {
  return {
    action: {
      id: 'action-1',
      type: 'claim_player',
      label: 'Claim Now',
      description: 'Submit a waiver claim for this player',
      surface: 'waiver_wire',
      leagueId: 'league-1',
      teamId: 'team-1',
      sport: 'NFL',
      leagueType: 'redraft',
      safetyClass: 'confirmed',
      requiresConfirmation: true,
      requiresCommissioner: false,
      requiresPremium: false,
      requiredPermissions: ['member'],
      isAvailable: true,
      disabledReason: null,
      payload: { playerIds: ['player-1'] },
    },
    context: {
      role: 'member',
      sport: 'NFL',
      leagueType: 'redraft',
      leagueId: 'league-1',
      teamId: 'team-1',
      subscriptionState: {
        hasPremium: false,
        hasCommissioner: false,
        hasAdmin: false,
      },
      leagueState: {
        isLocked: false,
        isWaiverOpen: true,
        isLineupLocked: false,
        isDraftActive: false,
        isDraftComplete: true,
        isTradeDeadlinePast: false,
        isInPlayoffs: false,
      },
    },
  }
}

describe('POST /api/ai/actions/validate contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } })
    validateActionExecutionServerSideMock.mockResolvedValue({
      allowed: true,
      status: 200,
      message: 'Action execution validated successfully.',
      issues: [],
      context: {
        userId: 'user-1',
        role: 'member',
        sport: 'NFL',
        leagueType: 'redraft',
        leagueId: 'league-1',
        teamId: 'team-1',
        subscriptionState: {
          hasPremium: false,
          hasCommissioner: false,
          hasAdmin: false,
        },
        leagueState: {
          isLocked: false,
          isWaiverOpen: true,
          isLineupLocked: false,
          isDraftActive: false,
          isDraftComplete: true,
          isTradeDeadlinePast: false,
          isInPlayoffs: false,
        },
      },
    })
  })

  it('returns 401 when unauthenticated', async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    const { POST } = await import('@/app/api/ai/actions/validate/route')
    const req = createMockNextRequest('http://localhost/api/ai/actions/validate', {
      method: 'POST',
      body: JSON.stringify(buildPayload()),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req as any)
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('returns normalized success payload when validation passes', async () => {
    const { POST } = await import('@/app/api/ai/actions/validate/route')
    const req = createMockNextRequest('http://localhost/api/ai/actions/validate', {
      method: 'POST',
      body: JSON.stringify(buildPayload()),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      message: 'Action execution validated successfully.',
      normalizedContext: { userId: 'user-1' },
    })
  })
})
