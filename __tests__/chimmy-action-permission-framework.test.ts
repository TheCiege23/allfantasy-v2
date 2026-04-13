import { describe, expect, it } from 'vitest'
import type { AIAction, AIActionContext } from '@/lib/chimmy-actions'
import { evaluateAIActionDecision, getAIActionClass } from '@/lib/chimmy-actions'

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
      currentWeek: 3,
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

function buildAction(type: AIAction['type'], overrides: Partial<AIAction> = {}): AIAction {
  return {
    id: `action-${type}`,
    type,
    label: type,
    description: type,
    surface: 'dashboard',
    leagueId: 'league-1',
    teamId: 'team-1',
    sport: 'NFL',
    leagueType: 'redraft',
    safetyClass: 'instant',
    requiresConfirmation: false,
    requiresCommissioner: false,
    requiresPremium: false,
    requiredPermissions: ['member'],
    isAvailable: true,
    disabledReason: null,
    payload: {},
    ...overrides,
  }
}

describe('chimmy action permissions/safety framework', () => {
  it('classifies and allows safe immediate actions without confirmation', () => {
    const action = buildAction('open_deep_dive', {
      payload: { playerIds: ['player-1'] },
    })

    expect(getAIActionClass(action)).toBe('safe_immediate')
    const decision = evaluateAIActionDecision(action, buildContext())

    expect(decision.actionClass).toBe('safe_immediate')
    expect(decision.status).toBe('allowed')
    expect(decision.requiresConfirmation).toBe(false)
  })

  it('classifies confirmed user actions and requires confirmation', () => {
    const action = buildAction('claim_player', {
      safetyClass: 'confirmed',
      requiresConfirmation: true,
      payload: { playerId: 'player-1' },
    })

    const decision = evaluateAIActionDecision(action, buildContext())
    expect(decision.actionClass).toBe('confirmed_user')
    expect(decision.status).toBe('allowed_with_confirmation')
    expect(decision.requiresConfirmation).toBe(true)
  })

  it('treats drop player as confirmed user action with confirmation', () => {
    const action = buildAction('drop_player', {
      isDestructive: true,
      safetyClass: 'confirmed',
      payload: { playerId: 'player-1' },
    })

    const decision = evaluateAIActionDecision(action, buildContext())
    expect(decision.actionClass).toBe('confirmed_user')
    expect(decision.status).toBe('allowed_with_confirmation')
  })

  it('treats commissioner override style actions as restricted', () => {
    const action = buildAction('approve_issue', {
      safetyClass: 'confirmed',
      requiresCommissioner: true,
      requiredPermissions: ['commissioner'],
    })

    const decision = evaluateAIActionDecision(action, buildContext({ role: 'commissioner' }))
    expect(decision.actionClass).toBe('restricted')
  })

  it('blocks and explains premium-gated actions in plain language', () => {
    const action = buildAction('generate_counter', {
      requiresPremium: true,
      requiredPermissions: ['member', 'premium'],
      premiumBadgeLabel: 'Pro',
      payload: { targetTeamId: 'team-2', givingAssets: ['p1'], receivingAssets: ['p2'] },
    })

    const decision = evaluateAIActionDecision(
      action,
      buildContext({
        subscriptionState: {
          hasPremium: false,
          hasCommissioner: false,
          hasAdmin: false,
        },
      }),
    )

    expect(decision.status).toBe('blocked')
    expect(decision.blockedBy).toBe('premium')
    expect(decision.reason?.toLowerCase()).toContain('upgrade')
  })

  it('blocks and explains lineup lock / waiver window / draft state constraints', () => {
    const waiverAction = buildAction('claim_player', {
      safetyClass: 'confirmed',
      payload: { playerId: 'player-1' },
    })
    const waiverDecision = evaluateAIActionDecision(
      waiverAction,
      buildContext({ leagueState: { ...buildContext().leagueState, isWaiverOpen: false } }),
    )
    expect(waiverDecision.status).toBe('blocked')
    expect(waiverDecision.reason).toBe('Waivers are currently closed.')

    const lineupAction = buildAction('save_lineup', {
      safetyClass: 'confirmed',
      requiresConfirmation: true,
      payload: { changedSlotCount: 1 },
    })
    const lineupDecision = evaluateAIActionDecision(
      lineupAction,
      buildContext({ leagueState: { ...buildContext().leagueState, isLineupLocked: true } }),
    )
    expect(lineupDecision.status).toBe('blocked')
    expect(lineupDecision.reason?.toLowerCase()).toContain('lineup lock')

    const draftAction = buildAction('queue_player')
    const draftDecision = evaluateAIActionDecision(
      draftAction,
      buildContext({ leagueState: { ...buildContext().leagueState, isDraftActive: false } }),
    )
    expect(draftDecision.status).toBe('blocked')
    expect(draftDecision.reason?.toLowerCase()).toContain('draft')
  })

  it('blocks sport-rule violations and transaction legality with plain reasons', () => {
    const sportRuleAction = buildAction('move_to_ir', {
      sport: 'Soccer',
      leagueType: 'redraft',
      payload: { playerId: 'player-1' },
    })
    const sportDecision = evaluateAIActionDecision(
      sportRuleAction,
      buildContext({ sport: 'Soccer' }),
    )

    expect(sportDecision.status).toBe('blocked')
    expect(sportDecision.blockedBy).toBe('sport_rules')
    expect(sportDecision.reason?.toLowerCase()).toContain('not supported')

    const tradeAction = buildAction('propose_trade', {
      safetyClass: 'confirmed',
      payload: { givingAssets: ['p1'], receivingAssets: [] },
    })
    const tradeDecision = evaluateAIActionDecision(tradeAction, buildContext())

    expect(tradeDecision.status).toBe('blocked')
    expect(tradeDecision.blockedBy).toBe('transaction_legality')
    expect(tradeDecision.reason?.toLowerCase()).toContain('target team')
  })

  it('blocks commissioner-restricted actions for non-commissioners', () => {
    const action = buildAction('open_health_report', {
      requiresCommissioner: true,
      requiredPermissions: ['commissioner'],
      safetyClass: 'restricted',
    })

    const decision = evaluateAIActionDecision(action, buildContext({ role: 'member' }))
    expect(decision.status).toBe('blocked')
    expect(decision.blockedBy).toBe('commissioner_restriction')
    expect(decision.reason?.toLowerCase()).toContain('commissioner')
  })
})
