import { describe, expect, it } from 'vitest'

import { buildPlatformPulse, type PlatformPulseInput } from '@/lib/platform-pulse'
import type { LineupActionItem, LineupActionReasonType } from '@/lib/lineup-actions/types'
import type { CommissionerLeagueHealthSnapshot } from '@/lib/commissioner-hub/commissionerHubHealth'

function action(o: Partial<LineupActionItem> & { reasonType: LineupActionReasonType; leagueId: string }): LineupActionItem {
  return {
    leagueName: `League ${o.leagueId}`,
    sport: 'NFL' as LineupActionItem['sport'],
    platform: 'native',
    teamId: null,
    slotIndex: null,
    slotId: null,
    slotLabel: null,
    playerId: null,
    playerName: null,
    urgency: 'normal',
    lockTime: null,
    recommendedAction: null,
    suggestedReplacementPlayerId: null,
    confidence: null,
    expectedGain: null,
    sourceModule: 'lineup_scan',
    message: 'why-text',
    severity: 'info',
    ...o,
  } as LineupActionItem
}

function health(o: Partial<CommissionerLeagueHealthSnapshot> & { leagueId: string }): CommissionerLeagueHealthSnapshot {
  return {
    leagueName: `League ${o.leagueId}`,
    sport: 'NFL',
    leagueType: 'redraft',
    season: 2026,
    status: 'in_season',
    teamCount: 12,
    currentWeek: 5,
    generatedAt: new Date().toISOString(),
    source: 'native' as CommissionerLeagueHealthSnapshot['source'],
    dataConfidence: 'high' as CommissionerLeagueHealthSnapshot['dataConfidence'],
    healthScore: 80,
    engagementScore: 80,
    fairnessScore: 80,
    sustainabilityScore: 80,
    overallStatus: 'healthy' as CommissionerLeagueHealthSnapshot['overallStatus'],
    healthTrend: 'flat',
    summary: 'summary-text',
    metrics: {} as CommissionerLeagueHealthSnapshot['metrics'],
    alerts: [],
    recommendations: [],
    actions: [],
    assistantQuestions: [],
    ...o,
  } as CommissionerLeagueHealthSnapshot
}

const base: PlatformPulseInput = { context: 'global', actions: [] }

describe('buildPlatformPulse (Phase 3.6 engine)', () => {
  it('ranks a more urgent action above a less urgent one', () => {
    const items = buildPlatformPulse({
      ...base,
      actions: [
        action({ leagueId: 'a', reasonType: 'ai_start_sit', urgency: 'low', playerId: 'p1' }),
        action({ leagueId: 'b', reasonType: 'empty_starter', urgency: 'urgent', playerId: 'p2', severity: 'critical' }),
      ],
    })
    expect(items[0].leagueId).toBe('b')
    expect(items[0].priority).toBeGreaterThan(items[1].priority)
  })

  it('categorizes injuries as Monitor and other actions as Recommend', () => {
    const items = buildPlatformPulse({
      ...base,
      actions: [
        action({ leagueId: 'a', reasonType: 'injured_starter', playerId: 'p1' }),
        action({ leagueId: 'a', reasonType: 'ai_waiver', playerId: 'p2' }),
        action({ leagueId: 'a', reasonType: 'empty_starter', playerId: 'p3' }),
      ],
    })
    const byKind = Object.fromEntries(items.map((i) => [i.kind, i.category]))
    expect(byKind.injury_watch).toBe('Monitor')
    expect(byKind.ai_recommendation).toBe('Recommend')
    expect(byKind.lineup_urgent).toBe('Recommend')
  })

  it('normalizes confidence and never fabricates it', () => {
    const items = buildPlatformPulse({
      ...base,
      actions: [
        action({ leagueId: 'a', reasonType: 'ai_start_sit', playerId: 'p1', confidence: 78 }), // 0-100 form
        action({ leagueId: 'b', reasonType: 'ai_start_sit', playerId: 'p2', confidence: 0.42 }), // 0-1 form
        action({ leagueId: 'c', reasonType: 'ai_start_sit', playerId: 'p3', confidence: null }),
      ],
    })
    const by = Object.fromEntries(items.map((i) => [i.leagueId, i.confidence]))
    expect(by.a).toBeCloseTo(0.78)
    expect(by.b).toBeCloseTo(0.42)
    expect(by.c).toBeUndefined()
  })

  it('passes the real message through as `why`, never inventing one', () => {
    const [item] = buildPlatformPulse({
      ...base,
      actions: [action({ leagueId: 'a', reasonType: 'ai_start_sit', playerId: 'p1', message: 'Start Cook; better matchup.' })],
    })
    expect(item.why).toBe('Start Cook; better matchup.')
  })

  it('scopes to the selected league in team context', () => {
    const items = buildPlatformPulse({
      context: 'team',
      selectedLeagueId: 'a',
      actions: [
        action({ leagueId: 'a', reasonType: 'empty_starter', playerId: 'p1' }),
        action({ leagueId: 'b', reasonType: 'empty_starter', playerId: 'p2' }),
      ],
    })
    expect(items).toHaveLength(1)
    expect(items[0].leagueId).toBe('a')
  })

  it('Global surfaces the single worst-health league; counts appear only in Global', () => {
    const items = buildPlatformPulse({
      ...base,
      waiverCount: 3,
      pendingTradeCount: 2,
      commissionerHealth: [health({ leagueId: 'a', healthScore: 30 }), health({ leagueId: 'b', healthScore: 45 })],
    })
    const attn = items.find((i) => i.kind === 'league_needs_attention')
    expect(attn?.leagueId).toBe('a') // 30 < 45
    expect(attn?.trajectory).toBeUndefined() // health is current-state, no fabricated movement
    expect(items.some((i) => i.kind === 'waiver_pickups')).toBe(true)
    expect(items.some((i) => i.kind === 'pending_trades')).toBe(true)
  })

  it('Commissioner surfaces this league\'s low sub-scores and no cross-league counts', () => {
    const items = buildPlatformPulse({
      context: 'commissioner',
      selectedLeagueId: 'a',
      actions: [],
      waiverCount: 9,
      commissionerHealth: [health({ leagueId: 'a', fairnessScore: 20, sustainabilityScore: 40, healthScore: 80, engagementScore: 90 })],
    })
    const metrics = items.filter((i) => i.kind === 'league_health_low').map((i) => i.data.metric)
    expect(metrics).toContain('fairness')
    expect(metrics).toContain('sustainability')
    expect(metrics).not.toContain('engagement') // 90 is healthy
    expect(items.some((i) => i.kind === 'waiver_pickups')).toBe(false)
  })

  it('includes drafts inside the window and excludes those outside it', () => {
    const now = Date.parse('2026-09-01T00:00:00Z')
    const items = buildPlatformPulse({
      ...base,
      now,
      upcomingDrafts: [
        { leagueId: 'a', leagueName: 'Soon', draftDate: '2026-09-02T00:00:00Z' }, // +24h
        { leagueId: 'b', leagueName: 'Later', draftDate: '2026-09-10T00:00:00Z' }, // +216h
        { leagueId: 'c', leagueName: 'Past', draftDate: '2026-08-30T00:00:00Z' }, // -48h
      ],
    })
    const draftLeagues = items.filter((i) => i.kind === 'draft_soon').map((i) => i.leagueId)
    expect(draftLeagues).toEqual(['a'])
  })

  it('dedupes identical signals and caps at 5', () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      action({ leagueId: `lg${i}`, reasonType: 'empty_starter', urgency: 'urgent', playerId: `p${i}` }),
    )
    // Two actions that collapse to the same dedupe key (same league/reason/player).
    const dupePair = [
      action({ leagueId: 'dup', reasonType: 'empty_starter', playerId: 'x', urgency: 'low' }),
      action({ leagueId: 'dup', reasonType: 'empty_starter', playerId: 'x', urgency: 'urgent' }),
    ]
    const items = buildPlatformPulse({ ...base, actions: [...many, ...dupePair] })
    expect(items).toHaveLength(5)
    // Distinct ids only (dedupe held).
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length)
  })
})

describe('buildPlatformPulse — summarize (Phase 3.8B, no duplicate headlines)', () => {
  it('collapses multiple same-kind signals in ONE league into a single summarized item', () => {
    const items = buildPlatformPulse({
      ...base,
      actions: [
        action({ leagueId: 'a', reasonType: 'empty_starter', playerId: 'p1', message: 'Slot 1 empty' }),
        action({ leagueId: 'a', reasonType: 'illegal_slot', playerId: 'p2', message: 'Slot 2 illegal' }),
        action({ leagueId: 'a', reasonType: 'native_starter_gap', playerId: 'p3', message: 'Slot 3 gap' }),
      ],
    })
    const lineup = items.filter((i) => i.kind === 'lineup_urgent')
    expect(lineup).toHaveLength(1) // three → one, no repeated "Set your lineup"
    expect(lineup[0].summarized).toBe(true)
    expect(lineup[0].data.count).toBe(3)
    // whyDetails aggregates each real reason (never fabricated).
    expect(lineup[0].whyDetails).toEqual(['Slot 1 empty', 'Slot 2 illegal', 'Slot 3 gap'])
  })

  it('does NOT collapse the same kind across different leagues', () => {
    const items = buildPlatformPulse({
      ...base,
      actions: [
        action({ leagueId: 'a', reasonType: 'empty_starter', playerId: 'p1' }),
        action({ leagueId: 'b', reasonType: 'empty_starter', playerId: 'p2' }),
      ],
    })
    expect(items.filter((i) => i.kind === 'lineup_urgent')).toHaveLength(2)
    expect(items.every((i) => !i.summarized)).toBe(true)
  })

  it('leaves a single same-kind item unsummarized (no fake count)', () => {
    const [item] = buildPlatformPulse({
      ...base,
      actions: [action({ leagueId: 'a', reasonType: 'empty_starter', playerId: 'p1' })],
    })
    expect(item.summarized).toBeUndefined()
    expect(item.data.count).toBeUndefined()
  })

  it("populates a health item's whyDetails from the real snapshot alerts", () => {
    const [item] = buildPlatformPulse({
      ...base,
      commissionerHealth: [
        health({ leagueId: 'a', healthScore: 16, alerts: ['12 inactive managers', 'Engagement dropping'] }),
      ],
    })
    expect(item.kind).toBe('league_needs_attention')
    expect(item.whyDetails).toEqual(['12 inactive managers', 'Engagement dropping'])
  })
})
