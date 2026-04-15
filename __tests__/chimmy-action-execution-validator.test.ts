import { describe, expect, it } from 'vitest'
import type { AIAction, AIActionContext } from '@/lib/chimmy-actions/AIActionModel'
import { validateActionExecution } from '@/lib/chimmy-actions/AIActionExecutionValidator'

function buildContext(overrides: Partial<AIActionContext> = {}): AIActionContext {
  return {
    userId: 'user-1',
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
      isDraftActive: true,
      isDraftComplete: false,
      isTradeDeadlinePast: false,
      isInPlayoffs: false,
      currentWeek: 4,
    },
    rosterState: {
      hasIR: true,
      hasIL: true,
      hasTaxi: true,
      hasDevy: true,
    },
    ...overrides,
  }
}

function buildAction(overrides: Partial<AIAction> = {}): AIAction {
  return {
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
    payload: {
      playerIds: ['player-1'],
      playerNames: ['Player One'],
      bidAmount: 9,
    },
    prefillTarget: 'waiver_claim_modal',
    prefillData: {},
    workflowPrefill: null,
    deepDiveHref: null,
    isDestructive: false,
    ...overrides,
  }
}

describe('validateActionExecution', () => {
  it('allows an action with valid waiver prefill and open waivers', () => {
    const result = validateActionExecution(buildAction(), buildContext())

    expect(result.allowed).toBe(true)
    expect(result.issues).toEqual([])
    expect(result.workflowPrefill?.workflowType).toBe('waiver_claim')
  })

  it('blocks execution when required prefill fields are missing', () => {
    const result = validateActionExecution(
      buildAction({
        payload: {
          playerIds: [],
          playerNames: [],
        },
      }),
      buildContext(),
    )

    expect(result.allowed).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'missing_field' && issue.field === 'playerId')).toBe(true)
  })

  it('blocks waiver workflows when waivers are closed', () => {
    const result = validateActionExecution(
      buildAction(),
      buildContext({
        leagueState: {
          ...buildContext().leagueState,
          isWaiverOpen: false,
        },
      }),
    )

    expect(result.allowed).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'league_state_blocked')).toBe(true)
  })
})
