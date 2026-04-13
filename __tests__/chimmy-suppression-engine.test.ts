import { describe, expect, it } from 'vitest'
import {
  evaluateAlertSuppression,
  groupLowPriorityAlerts,
  resolveEffectiveCooldownMultiplier,
} from '../lib/chimmy-alerts/ChimmyAlertSuppressionEngine'
import type { ChimmyAlert, ChimmyAlertContext, ChimmyAlertUserPreferences } from '../lib/chimmy-alerts/types'
import type { ChimmyAlertDeliveryHistory } from '../lib/chimmy-alerts/ChimmyAlertDeliveryRouter'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function baseAlert(overrides?: Partial<ChimmyAlert>): ChimmyAlert {
  return {
    alertId: 'alert-1',
    dedupeKey: 'dedupe-1',
    class: 'lineup',
    type: 'lineup_incomplete',
    title: 'Lineup not set',
    message: 'You have empty slots.',
    severity: 'urgent',
    confidenceScore: 90,
    urgencyScore: 85,
    channels: ['dashboard_card'],
    primaryChannel: 'dashboard_card',
    dismissible: true,
    snoozable: true,
    repeatable: true,
    repeatCooldownMinutes: 120,
    roleScope: 'member',
    actions: [],
    leagueId: 'league-1',
    ...overrides,
  }
}

function baseContext(overrides?: Partial<ChimmyAlertContext>): ChimmyAlertContext {
  return {
    userId: 'user-1',
    role: 'member',
    sport: 'NFL',
    leagueType: 'redraft',
    leagueId: 'league-1',
    subscriptionState: { hasPremium: true, hasCommissioner: false, hasAdmin: false },
    ...overrides,
  }
}

const noHistory: ChimmyAlertDeliveryHistory = {}
const defaultPrefs: ChimmyAlertUserPreferences = {}

// ── evaluateAlertSuppression ──────────────────────────────────────────────────

describe('evaluateAlertSuppression', () => {
  it('allows alert when no prefs or history', () => {
    const r = evaluateAlertSuppression(baseAlert(), baseContext(), defaultPrefs, noHistory)
    expect(r.suppress).toBe(false)
    expect(r.reason).toBe('not_suppressed')
  })

  // ── Mute controls ─────────────────────────────────────────────────────────

  it('suppresses when class is in mutedClasses', () => {
    const r = evaluateAlertSuppression(
      baseAlert({ class: 'waiver', type: 'priority_add_available' }),
      baseContext(),
      { mutedClasses: ['waiver'] },
    )
    expect(r.suppress).toBe(true)
    expect(r.reason).toBe('muted_class')
  })

  it('suppresses when type is in mutedTypes', () => {
    const r = evaluateAlertSuppression(
      baseAlert(),
      baseContext(),
      { mutedTypes: ['lineup_incomplete'] },
    )
    expect(r.suppress).toBe(true)
    expect(r.reason).toBe('muted_type')
  })

  it('suppresses via classPrefs.muted', () => {
    const r = evaluateAlertSuppression(
      baseAlert(),
      baseContext(),
      { classPrefs: { lineup: { muted: true } } },
    )
    expect(r.suppress).toBe(true)
    expect(r.reason).toBe('muted_class_pref')
  })

  it('suppresses via typeOverrides.muted', () => {
    const r = evaluateAlertSuppression(
      baseAlert(),
      baseContext(),
      { typeOverrides: { lineup_incomplete: { muted: true } } },
    )
    expect(r.suppress).toBe(true)
    expect(r.reason).toBe('muted_type_override')
  })

  // ── League prefs ──────────────────────────────────────────────────────────

  it('suppresses when league is fully disabled', () => {
    const r = evaluateAlertSuppression(
      baseAlert({ leagueId: 'league-1' }),
      baseContext(),
      { leaguePrefs: [{ leagueId: 'league-1', disabled: true }] },
    )
    expect(r.suppress).toBe(true)
    expect(r.reason).toBe('league_disabled')
  })

  it('suppresses when class is in league mutedClasses', () => {
    const r = evaluateAlertSuppression(
      baseAlert({ leagueId: 'league-1', class: 'lineup' }),
      baseContext(),
      { leaguePrefs: [{ leagueId: 'league-1', mutedClasses: ['lineup'] }] },
    )
    expect(r.suppress).toBe(true)
    expect(r.reason).toBe('league_muted_class')
  })

  it('does NOT suppress when leagueId does not match', () => {
    const r = evaluateAlertSuppression(
      baseAlert({ leagueId: 'league-other' }),
      baseContext(),
      { leaguePrefs: [{ leagueId: 'league-1', disabled: true }] },
    )
    expect(r.suppress).toBe(false)
  })

  // ── Commissioner prefs ────────────────────────────────────────────────────

  it('suppresses commissioner alerts when commissionerPrefs.enabled=false', () => {
    const r = evaluateAlertSuppression(
      baseAlert({ class: 'commissioner', type: 'suspicious_trade_signal' }),
      baseContext({ role: 'commissioner' }),
      { commissionerPrefs: { enabled: false } },
    )
    expect(r.suppress).toBe(true)
    expect(r.reason).toBe('commissioner_pref_disabled')
  })

  it('suppresses suspicious_trade_signal when receiveSuspiciousTradeAlerts=false', () => {
    const r = evaluateAlertSuppression(
      baseAlert({ class: 'commissioner', type: 'suspicious_trade_signal' }),
      baseContext({ role: 'commissioner' }),
      { commissionerPrefs: { enabled: true, receiveSuspiciousTradeAlerts: false } },
    )
    expect(r.suppress).toBe(true)
    expect(r.reason).toBe('commissioner_type_gate')
  })

  // ── Snooze ────────────────────────────────────────────────────────────────

  it('suppresses snoozed alert when snoozeUntil is in the future', () => {
    const now = Date.now()
    const r = evaluateAlertSuppression(
      baseAlert({ dedupeKey: 'dk-1' }),
      baseContext(),
      { snoozedAlerts: [{ dedupeKey: 'dk-1', snoozeUntil: now + 60_000 }] },
      noHistory,
      now,
    )
    expect(r.suppress).toBe(true)
    expect(r.reason).toBe('snoozed')
  })

  it('does NOT suppress when snooze has expired', () => {
    const now = Date.now()
    const r = evaluateAlertSuppression(
      baseAlert({ dedupeKey: 'dk-1' }),
      baseContext(),
      { snoozedAlerts: [{ dedupeKey: 'dk-1', snoozeUntil: now - 1 }] },
      noHistory,
      now,
    )
    expect(r.suppress).toBe(false)
  })

  it('suppresses via history.snoozeUntil', () => {
    const now = Date.now()
    const r = evaluateAlertSuppression(
      baseAlert(),
      baseContext(),
      {},
      { snoozeUntil: now + 30_000 },
      now,
    )
    expect(r.suppress).toBe(true)
    expect(r.reason).toBe('snoozed')
  })

  // ── Resolved / acted_on ───────────────────────────────────────────────────

  it('suppresses resolved alerts always', () => {
    const r = evaluateAlertSuppression(
      baseAlert(),
      baseContext(),
      {},
      { resolvedAt: new Date(Date.now() - 1000) },
    )
    expect(r.suppress).toBe(true)
    expect(r.reason).toBe('resolved')
  })

  it('suppresses acted_on for non-repeatable alerts', () => {
    const r = evaluateAlertSuppression(
      baseAlert({ repeatable: false }),
      baseContext(),
      {},
      { actedOnAt: new Date(Date.now() - 1000) },
    )
    expect(r.suppress).toBe(true)
    expect(r.reason).toBe('acted_on')
  })

  it('does NOT suppress acted_on for repeatable alerts', () => {
    const r = evaluateAlertSuppression(
      baseAlert({ repeatable: true }),
      baseContext(),
      {},
      { actedOnAt: new Date(Date.now() - 1000) },
    )
    expect(r.suppress).toBe(false)
  })

  // ── Signal stale ──────────────────────────────────────────────────────────

  it('suppresses lineup alert when lineupIncomplete signal is false', () => {
    const r = evaluateAlertSuppression(
      baseAlert({ type: 'lineup_incomplete', severity: 'urgent' }),
      baseContext({ signalBundle: { lineupIncomplete: false } }),
      {},
    )
    expect(r.suppress).toBe(true)
    expect(r.reason).toBe('signal_stale')
  })

  it('does NOT suppress stale critical alert', () => {
    const r = evaluateAlertSuppression(
      baseAlert({ type: 'lineup_incomplete', severity: 'critical' }),
      baseContext({ signalBundle: { lineupIncomplete: false } }),
      {},
    )
    expect(r.suppress).toBe(false)
  })

  it('does NOT suppress when signal key is absent from bundle', () => {
    const r = evaluateAlertSuppression(
      baseAlert({ type: 'lineup_incomplete' }),
      baseContext({ signalBundle: {} }),
      {},
    )
    expect(r.suppress).toBe(false)
  })

  // ── Dismissal escalation ──────────────────────────────────────────────────

  it('suppresses after 1 dismissal within 12h', () => {
    const now = Date.now()
    const r = evaluateAlertSuppression(
      baseAlert(),
      baseContext(),
      {},
      { dismissalCount: 1, lastDismissedAt: new Date(now - 1 * 60 * 60 * 1000) },
      now,
    )
    expect(r.suppress).toBe(true)
    expect(r.reason).toBe('dismissed_escalated')
  })

  it('allows after dismissal cooldown expires (1 dismiss, 12h passed)', () => {
    const now = Date.now()
    const r = evaluateAlertSuppression(
      baseAlert(),
      baseContext(),
      {},
      { dismissalCount: 1, lastDismissedAt: new Date(now - 13 * 60 * 60 * 1000) },
      now,
    )
    expect(r.suppress).toBe(false)
  })

  it('suppresses permanently after 4+ dismissals', () => {
    const now = Date.now()
    const r = evaluateAlertSuppression(
      baseAlert(),
      baseContext(),
      {},
      { dismissalCount: 5, lastDismissedAt: new Date(now - 1000 * 60 * 20) },
      now,
    )
    expect(r.suppress).toBe(true)
    expect(r.reason).toBe('dismissed_permanently')
  })

  // ── Reduced frequency ─────────────────────────────────────────────────────

  it('suppresses via reduced frequency when still within scaled cooldown', () => {
    const now = Date.now()
    // cooldown = 120 min * 2 (reduced) = 240 min. Last seen 200 min ago → still cooling.
    const r = evaluateAlertSuppression(
      baseAlert({ repeatCooldownMinutes: 120 }),
      baseContext(),
      { frequency: 'reduced' },
      { lastSeenAt: new Date(now - 200 * 60 * 1000) },
      now,
    )
    expect(r.suppress).toBe(true)
    expect(r.reason).toBe('reduced_frequency_cooldown')
  })

  it('allows at normal frequency when cooldown has passed', () => {
    const now = Date.now()
    const r = evaluateAlertSuppression(
      baseAlert({ repeatCooldownMinutes: 120 }),
      baseContext(),
      { frequency: 'normal' },
      { lastSeenAt: new Date(now - 130 * 60 * 1000) },
      now,
    )
    expect(r.suppress).toBe(false)
  })
})

// ── resolveEffectiveCooldownMultiplier ────────────────────────────────────────

describe('resolveEffectiveCooldownMultiplier', () => {
  it('returns 1 for default prefs', () => {
    expect(resolveEffectiveCooldownMultiplier(baseAlert(), {})).toBe(1)
  })

  it('returns 2 for frequency=reduced', () => {
    expect(resolveEffectiveCooldownMultiplier(baseAlert(), { frequency: 'reduced' })).toBe(2)
  })

  it('returns 4 for frequency=minimal', () => {
    expect(resolveEffectiveCooldownMultiplier(baseAlert(), { frequency: 'minimal' })).toBe(4)
  })

  it('class pref overrides global frequency', () => {
    const mult = resolveEffectiveCooldownMultiplier(baseAlert({ class: 'lineup' }), {
      frequency: 'minimal',
      classPrefs: { lineup: { frequency: 'normal' } },
    })
    expect(mult).toBe(1)
  })

  it('typeOverride.cooldownMultiplier overrides all', () => {
    const mult = resolveEffectiveCooldownMultiplier(baseAlert({ type: 'lineup_incomplete' }), {
      frequency: 'reduced',
      typeOverrides: { lineup_incomplete: { cooldownMultiplier: 3 } },
    })
    expect(mult).toBe(3)
  })
})

// ── groupLowPriorityAlerts ────────────────────────────────────────────────────

describe('groupLowPriorityAlerts', () => {
  function makeInfo(id: string, alertClass: string, urgencyScore: number): ChimmyAlert {
    return {
      ...baseAlert(),
      alertId: id,
      dedupeKey: `dk-${id}`,
      class: alertClass as never,
      severity: 'informational',
      urgencyScore,
    }
  }

  it('keeps all alerts when class has fewer than 3 informational', () => {
    const alerts = [makeInfo('a1', 'matchup', 50), makeInfo('a2', 'matchup', 40)]
    expect(groupLowPriorityAlerts(alerts)).toHaveLength(2)
  })

  it('trims to top-1 when class has 3+ informational alerts', () => {
    const alerts = [
      makeInfo('a1', 'matchup', 45),
      makeInfo('a2', 'matchup', 70),
      makeInfo('a3', 'matchup', 30),
    ]
    const result = groupLowPriorityAlerts(alerts)
    expect(result).toHaveLength(1)
    expect(result[0].alertId).toBe('a2') // highest urgency
  })

  it('does NOT group urgent/critical alerts', () => {
    const urgent = { ...baseAlert(), alertId: 'u1', severity: 'urgent' as const, urgencyScore: 80 }
    const infos = [
      makeInfo('a1', 'lineup', 40),
      makeInfo('a2', 'lineup', 50),
      makeInfo('a3', 'lineup', 30),
    ]
    const result = groupLowPriorityAlerts([urgent, ...infos])
    expect(result.find((a) => a.alertId === 'u1')).toBeTruthy()
    // Informational lineup group trimmed to 1
    const infoResults = result.filter((a) => a.severity === 'informational')
    expect(infoResults).toHaveLength(1)
  })

  it('handles multiple classes independently', () => {
    const matchupInfos = [
      makeInfo('m1', 'matchup', 55),
      makeInfo('m2', 'matchup', 30),
      makeInfo('m3', 'matchup', 20),
    ]
    const waiverInfos = [
      makeInfo('w1', 'waiver', 60),
      makeInfo('w2', 'waiver', 45),
      makeInfo('w3', 'waiver', 35),
    ]
    const result = groupLowPriorityAlerts([...matchupInfos, ...waiverInfos])
    // 1 from matchup + 1 from waiver
    expect(result).toHaveLength(2)
    expect(result.find((a) => a.alertId === 'm1')).toBeTruthy()
    expect(result.find((a) => a.alertId === 'w1')).toBeTruthy()
  })
})
