import { describe, expect, it } from 'vitest'

import {
  buildTradeGradeEmail,
  explainGrade,
  hasNoSignal,
  sideMath,
} from '@/lib/trade-intel/tradeGradeEmail'
import type {
  GradedTrade,
  TradeAsset,
  TradePickAsset,
  TradeSideGrade,
} from '@/lib/trade-intel/sleeperTradeGradeService'

function player(name: string, credited: number): TradeAsset {
  return {
    playerId: name,
    name,
    position: 'WR',
    pointsBySeason: { '2026': credited },
    creditedBySeason: { '2026': credited },
    departed: null,
    gamesMissedBySeason: { '2026': 0 },
  }
}

function pick(round: number, pending: boolean, credited = 0): TradePickAsset {
  return {
    season: '2026',
    round,
    originalRosterId: 1,
    label: `2026 round ${round}`,
    resolved: pending
      ? null
      : {
          playerId: `p${round}`,
          name: `Rookie ${round}`,
          position: 'RB',
          creditedBySeason: { '2026': credited },
          departed: null,
        },
    pending,
    rerouted: false,
  }
}

function side(o: Partial<TradeSideGrade> & { managerName: string; net: number }): TradeSideGrade {
  return {
    rosterId: 1,
    ownerId: 'o',
    managerName: o.managerName,
    teamName: null,
    avatar: null,
    playersIn: o.playersIn ?? [],
    playersOut: o.playersOut ?? [],
    picksIn: o.picksIn ?? [],
    picksOut: o.picksOut ?? [],
    madePlayoffs: null,
    seasonNets: [{ season: '2026', net: o.net, partial: true }],
    cumulativeNet: o.net,
    initialGrade: o.initialGrade ?? 'C',
    currentGrade: o.currentGrade ?? 'C',
    trend: 'steady',
  }
}

function trade(sides: TradeSideGrade[], tie = false): GradedTrade {
  return {
    id: 'league:tx',
    season: '2026',
    week: 1,
    createdIso: '2026-08-12T01:31:00.000Z',
    multiTeam: false,
    tie,
    hasPendingPicks: sides.some((s) => [...s.picksIn, ...s.picksOut].some((p) => p.pending)),
    sides,
  }
}

/** The real trade that prompted this: preseason, nothing scored, picks undrafted. */
const PRESEASON = trade(
  [
    side({
      managerName: 'managerOne',
      playersIn: [player('Brenton Strange', 0)],
      picksIn: [pick(2, true)],
      playersOut: [player('Rashid Shaheed', 0), player('Woody Marks', 0)],
      picksOut: [pick(3, true)],
      net: 0,
    }),
    side({
      managerName: 'managerTwo',
      playersIn: [player('Rashid Shaheed', 0), player('Woody Marks', 0)],
      picksIn: [pick(3, true)],
      playersOut: [player('Brenton Strange', 0)],
      picksOut: [pick(2, true)],
      net: 0,
    }),
  ],
  true,
)

const MIDSEASON = trade([
  side({
    managerName: 'managerOne',
    playersIn: [player('Brenton Strange', 121.4)],
    playersOut: [player('Rashid Shaheed', 154.8), player('Woody Marks', 96.1)],
    picksIn: [pick(2, false, 88.2)],
    net: -41.3,
    initialGrade: 'D',
  }),
  side({
    managerName: 'managerTwo',
    playersIn: [player('Rashid Shaheed', 154.8), player('Woody Marks', 96.1)],
    playersOut: [player('Brenton Strange', 121.4)],
    picksOut: [pick(2, false, 88.2)],
    net: 41.3,
    initialGrade: 'B',
  }),
])

const URL = 'https://www.allfantasy.ai/league/abc?view=legacy'

describe('trade grade email — rendering', () => {
  it('emits no literal HTML entities in the visible body', () => {
    const { html } = buildTradeGradeEmail({ leagueName: 'Dads Dynasty', trade: PRESEASON, ledgerUrl: URL })
    // The old email double-escaped its own &nbsp; spacers, so managers literally read "&nbsp;".
    expect(html).not.toContain('&amp;nbsp;')
    expect(html).not.toContain('&nbsp;')
  })

  it('renders both managers and every asset on both sides', () => {
    const { html } = buildTradeGradeEmail({ leagueName: 'Dads Dynasty', trade: PRESEASON, ledgerUrl: URL })
    for (const text of [
      'managerOne',
      'managerTwo',
      'Brenton Strange',
      'Rashid Shaheed',
      'Woody Marks',
      '2026 round 2',
      '2026 round 3',
    ]) {
      expect(html).toContain(text)
    }
    expect(html).toContain(URL)
  })

  it('escapes a hostile league name rather than emitting markup', () => {
    const { html, subject } = buildTradeGradeEmail({
      leagueName: '<script>alert(1)</script>',
      trade: PRESEASON,
      ledgerUrl: URL,
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
    // Subject is plain text in the mail header, so it carries the raw name.
    expect(subject).toContain('<script>')
  })
})

describe('trade grade email — refusing to fake a verdict', () => {
  it('detects that nothing has been credited yet', () => {
    expect(hasNoSignal(PRESEASON)).toBe(true)
    expect(hasNoSignal(MIDSEASON)).toBe(false)
  })

  it('does not assert letter grades in the subject before any game is played', () => {
    const { subject } = buildTradeGradeEmail({ leagueName: 'Dads Dynasty', trade: PRESEASON, ledgerUrl: URL })
    expect(subject).toContain('too early to grade')
    // The old subject read "initial grades: managerOne C, managerTwo C" off zero data.
    expect(subject).not.toMatch(/managerOne C/)
  })

  it('explains that a zero-point trade sits mid-C rather than being average', () => {
    const body = explainGrade(PRESEASON, true)
    expect(body).toContain('No games have been played')
    expect(body).toContain('0.0')
    // Both undrafted picks must be called out as unable to count.
    expect(body).toContain('2026 round 2')
    expect(body).toContain('2026 round 3')
    expect(body).toContain('not been drafted yet')
  })

  it('shows a neutral dash instead of a C chip when there is no data', () => {
    const { html } = buildTradeGradeEmail({ leagueName: 'Dads Dynasty', trade: PRESEASON, ledgerUrl: URL })
    expect(html).toContain('no points credited yet')
    expect(html).toContain('>–<')
  })
})

describe('trade grade email — real grades once points exist', () => {
  it('puts both letters back in the subject', () => {
    const { subject } = buildTradeGradeEmail({ leagueName: 'Dads Dynasty', trade: MIDSEASON, ledgerUrl: URL })
    expect(subject).toContain('managerOne D')
    expect(subject).toContain('managerTwo B')
  })

  it('shows the arithmetic that produced the letter', () => {
    const m = sideMath(MIDSEASON.sides[0]!)
    expect(m.got).toBe(209.6)
    expect(m.gave).toBe(250.9)
    expect(m.net).toBe(-41.3)

    const body = explainGrade(MIDSEASON, false)
    expect(body).toContain('netted -41.3')
    expect(body).toContain('got 209.6')
    expect(body).toContain('gave 250.9')
  })

  it('reports net as got minus gave, matching what the engine graded', () => {
    for (const s of MIDSEASON.sides) {
      const m = sideMath(s)
      expect(Math.round((m.got - m.gave) * 10) / 10).toBe(m.net)
      expect(m.net).toBe(s.seasonNets[0]!.net)
    }
  })
})
