import { describe, expect, it } from 'vitest'

import { getDefaultChimmyChips } from '@/lib/chimmy-interface/ChimmyInterfaceService'

describe('getDefaultChimmyChips', () => {
  it('includes draft-focused first chips for draft sources', () => {
    const chips = getDefaultChimmyChips({
      leagueName: 'Dynasty League',
      hasLeagues: true,
      source: 'draft_room',
    })

    expect(chips[0]?.id).toBe('chip-draft-board')
    expect(chips[1]?.id).toBe('chip-draft-fade')
  })

  it('includes war room first chips for war room sources', () => {
    const chips = getDefaultChimmyChips({
      leagueName: 'Dynasty League',
      hasLeagues: true,
      source: 'war_room',
      sport: 'NFL',
    })

    expect(chips[0]?.id).toBe('chip-war-room-edges')
    expect(chips[1]?.id).toBe('chip-war-room-pivots')
  })

  it('includes league path chip for league sources', () => {
    const chips = getDefaultChimmyChips({
      leagueName: 'Dynasty League',
      hasLeagues: true,
      source: 'league',
    })

    expect(chips[0]?.id).toBe('chip-league-standings')
  })

  it('falls back to dashboard chip for generic sources', () => {
    const chips = getDefaultChimmyChips({ source: 'messages_ai' })
    expect(chips[0]?.id).toBe('chip-dashboard-focus')
  })

  it('preserves legacy chip ids for e2e compatibility', () => {
    const chips = getDefaultChimmyChips({ source: 'messages_ai' })
    const ids = chips.map((c) => c.id)

    expect(ids).toContain('chip-start-sit')
    expect(ids).toContain('chip-waiver')
    expect(ids).toContain('chip-trade')
  })

  it('returns at most 8 chips', () => {
    const chips = getDefaultChimmyChips({ source: 'war_room', hasLeagues: true, leagueName: 'League' })
    expect(chips.length).toBeLessThanOrEqual(8)
  })

  it('uses compact labels when compact mode is enabled', () => {
    const chips = getDefaultChimmyChips({ source: 'draft_room', compact: true })
    expect(chips[0]?.label).toBe('Draft board attack')
  })
})
