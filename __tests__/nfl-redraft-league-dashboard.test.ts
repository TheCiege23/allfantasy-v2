import { describe, it, expect } from 'vitest'
import { isNflRedraftCoreDashboardLeague } from '@/lib/league/is-nfl-redraft-core-dashboard'
import { openChimmyWithPrompt } from '@/lib/dashboard/open-chimmy-with-prompt'

describe('NFL redraft league shell gating', () => {
  it('accepts standard NFL redraft', () => {
    expect(
      isNflRedraftCoreDashboardLeague({
        sport: 'NFL',
        leagueType: 'redraft',
        isDynasty: false,
        leagueVariant: null,
        bestBallMode: false,
        guillotineMode: false,
        keeperPhaseActive: false,
      }),
    ).toBe(true)
  })

  it('rejects dynasty', () => {
    expect(
      isNflRedraftCoreDashboardLeague({
        sport: 'NFL',
        leagueType: 'dynasty',
        isDynasty: true,
        leagueVariant: null,
        bestBallMode: false,
        guillotineMode: false,
        keeperPhaseActive: false,
      }),
    ).toBe(false)
  })

  it('rejects survivor variant', () => {
    expect(
      isNflRedraftCoreDashboardLeague({
        sport: 'NFL',
        leagueType: 'redraft',
        isDynasty: false,
        leagueVariant: 'survivor',
        bestBallMode: false,
        guillotineMode: false,
        keeperPhaseActive: false,
      }),
    ).toBe(false)
  })
})

describe('openChimmyWithPrompt', () => {
  it('dispatches focus and prefill events', () => {
    const seen: string[] = []
    const a = (n: string, fn: (e: Event) => void) => {
      window.addEventListener(n, fn)
      return () => window.removeEventListener(n, fn)
    }
    const offA = a('af-dashboard-focus-left-chimmy', () => seen.push('focus'))
    const offB = a('af-chimmy-prefill', (e) => {
      const d = (e as CustomEvent<{ prompt?: string }>).detail?.prompt
      seen.push(`prefill:${d ?? ''}`)
    })
    try {
      openChimmyWithPrompt({
        leagueId: 'l1',
        source: 'roster',
        prompt: 'Hello Chimmy',
      })
      expect(seen).toEqual(['focus', 'prefill:Hello Chimmy'])
    } finally {
      offA()
      offB()
    }
  })
})
