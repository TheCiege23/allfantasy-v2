import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    platformNotification: {
      findMany: vi.fn(async () => []),
    },
    engagementEvent: {
      findMany: vi.fn(async () => []),
      create: vi.fn(async () => ({})),
    },
    userProfile: {
      findUnique: vi.fn(async () => ({ notificationPreferences: null })),
    },
  },
}))

vi.mock('@/lib/platform/notification-service', () => ({
  createPlatformNotification: vi.fn(async () => true),
}))

vi.mock('@/lib/notifications/NotificationDispatcher', () => ({
  dispatchNotification: vi.fn(async () => undefined),
}))

import { runUnifiedAlertEngine, renderAlertPayload } from '@/lib/chimmy-alerts'
import type { ChimmyAlertContext } from '@/lib/chimmy-alerts'

describe('chimmy unified alert engine', () => {
  it('creates actionable lineup and waiver alerts with urgency scoring', async () => {
    const context: ChimmyAlertContext = {
      userId: 'user-1',
      role: 'member',
      sport: 'NFL',
      leagueType: 'redraft',
      leagueId: 'league-1',
      signalBundle: {
        lineupIncomplete: true,
        lineupLockAt: new Date(Date.now() + 30 * 60_000).toISOString(),
        highConfidenceWaiverAdd: { playerName: 'Test RB', confidence: 92, faabPct: 18 },
      },
      userPreferences: { sensitivity: 'high' },
      subscriptionState: {
        hasPremium: true,
        hasCommissioner: false,
        hasAdmin: false,
      },
    }

    const alerts = await runUnifiedAlertEngine(context)
    const lineup = alerts.find((a) => a.type === 'lineup_incomplete')
    const waiver = alerts.find((a) => a.type === 'priority_add_available')

    expect(lineup).toBeTruthy()
    expect(lineup?.severity).toBe('critical')
    expect(lineup?.actions[0]?.label).toBe('Set Lineup')

    expect(waiver).toBeTruthy()
    expect(waiver?.actions[0]?.label).toBe('Claim Now')
  })

  it('suppresses commissioner-only alerts for member role', async () => {
    const context: ChimmyAlertContext = {
      userId: 'user-1',
      role: 'member',
      sport: 'NFL',
      leagueType: 'redraft',
      leagueId: 'league-1',
      signalBundle: {
        inactiveTeamCount: 3,
        suspiciousTradeSignal: true,
      },
      subscriptionState: {
        hasPremium: false,
        hasCommissioner: false,
        hasAdmin: false,
      },
    }

    const alerts = await runUnifiedAlertEngine(context)
    expect(alerts.find((a) => a.class === 'commissioner')).toBeUndefined()
  })

  it('renders deterministic dedupe keys for same context and candidate', () => {
    const context: ChimmyAlertContext = {
      userId: 'user-1',
      role: 'member',
      sport: 'NFL',
      leagueType: 'redraft',
      leagueId: 'league-1',
    }

    const candidate = {
      class: 'trade',
      type: 'new_trade_offer',
      title: 'Trade offer',
      message: 'You have a trade offer',
      confidenceScore: 99,
      urgencySignal: 70,
    } as const

    const a = renderAlertPayload(candidate as any, context)
    const b = renderAlertPayload(candidate as any, context)

    expect(a.dedupeKey).toBe(b.dedupeKey)
    expect(a.alertId).toBe(b.alertId)
  })
})
