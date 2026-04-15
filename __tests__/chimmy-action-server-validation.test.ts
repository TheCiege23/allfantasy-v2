import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AIAction, AIActionContext } from '@/lib/chimmy-actions/AIActionModel'

const resolveLeagueAccessMock = vi.fn()
const validateActionExecutionMock = vi.fn()

const prismaMock = {
  league: { findUnique: vi.fn() },
  leagueWaiverSettings: { findUnique: vi.fn() },
  roster: { findFirst: vi.fn() },
  waiverClaim: { count: vi.fn() },
  waiverTransaction: { count: vi.fn() },
}

vi.mock('@/lib/league-access', () => ({
  resolveLeagueAccess: resolveLeagueAccessMock,
}))

vi.mock('@/lib/chimmy-actions/AIActionExecutionValidator', () => ({
  validateActionExecution: validateActionExecutionMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

function buildAction(overrides: Partial<AIAction> = {}): AIAction {
  return {
    id: 'action-1',
    type: 'claim_player',
    label: 'Claim Player',
    description: 'Claim this player',
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
    payload: { playerId: 'player-1' },
    ...overrides,
  }
}

function buildContext(overrides: Partial<AIActionContext> = {}): AIActionContext {
  return {
    userId: 'client-user',
    role: 'member',
    sport: 'NFL',
    leagueType: 'redraft',
    leagueId: 'league-1',
    teamId: 'team-1',
    subscriptionState: {
      hasPremium: true,
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
      currentWeek: 5,
    },
    ...overrides,
  }
}

describe('validateActionExecutionServerSide', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    resolveLeagueAccessMock.mockResolvedValue({
      leagueId: 'league-1',
      leagueSport: 'NFL',
      isCommissioner: false,
      isMember: true,
    })

    prismaMock.league.findUnique.mockResolvedValue({ lockAllMoves: false })
    prismaMock.leagueWaiverSettings.findUnique.mockResolvedValue({ claimLimitPerPeriod: 1 })
    prismaMock.roster.findFirst.mockResolvedValue({ id: 'roster-1' })
    prismaMock.waiverClaim.count.mockResolvedValue(1)
    prismaMock.waiverTransaction.count.mockResolvedValue(1)

    validateActionExecutionMock.mockReturnValue({
      allowed: true,
      issues: [],
      workflowPrefill: null,
    })
  })

  it('hydrates transactionState from DB before running validation', async () => {
    const { validateActionExecutionServerSide } = await import('@/lib/chimmy-actions/AIActionServerValidation')

    const result = await validateActionExecutionServerSide(
      buildAction(),
      buildContext(),
      'server-user',
    )

    expect(result.allowed).toBe(true)
    expect(validateActionExecutionMock).toHaveBeenCalledTimes(1)

    const passedContext = validateActionExecutionMock.mock.calls[0][1] as AIActionContext
    expect(passedContext.userId).toBe('server-user')
    expect(passedContext.transactionState).toMatchObject({
      canTransact: true,
      rosterMoveLocked: false,
      maxTransactionsReached: true,
      pendingCommissionerApproval: true,
    })
  })

  it('returns 403 for non-members without calling validator', async () => {
    resolveLeagueAccessMock.mockResolvedValueOnce(null)
    const { validateActionExecutionServerSide } = await import('@/lib/chimmy-actions/AIActionServerValidation')

    const result = await validateActionExecutionServerSide(
      buildAction(),
      buildContext(),
      'server-user',
    )

    expect(result.allowed).toBe(false)
    expect(result.status).toBe(403)
    expect(result.issues[0]?.code).toBe('permission_denied')
    expect(validateActionExecutionMock).not.toHaveBeenCalled()
  })

  it('sets canTransact false when league lockAllMoves is enabled', async () => {
    prismaMock.league.findUnique.mockResolvedValueOnce({ lockAllMoves: true })

    const { validateActionExecutionServerSide } = await import('@/lib/chimmy-actions/AIActionServerValidation')

    await validateActionExecutionServerSide(
      buildAction(),
      buildContext(),
      'server-user',
    )

    const passedContext = validateActionExecutionMock.mock.calls[0][1] as AIActionContext
    expect(passedContext.transactionState).toMatchObject({
      canTransact: false,
      rosterMoveLocked: true,
    })
  })
})
