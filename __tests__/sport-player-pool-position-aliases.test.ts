import { describe, expect, it } from 'vitest'
import { getPositionFiltersForSport, waiverPositionMatches } from '@/lib/waiver-wire/SportWaiverResolver'
import { filterByPosition } from '@/lib/draft-room/DraftPlayerSearchResolver'

describe('Prompt 2 multi-sport position aliases', () => {
  it('uses GK as the soccer waiver filter and matches GKP data rows', () => {
    const filters = getPositionFiltersForSport('SOCCER')
    expect(filters).toContain('GK')
    expect(filters).not.toContain('GKP')

    expect(waiverPositionMatches('GKP', 'GK')).toBe(true)
    expect(waiverPositionMatches('GK', 'GKP')).toBe(true)
    expect(waiverPositionMatches('FWD', 'GK')).toBe(false)
  })

  it('draft-room position filter treats GK and GKP as equivalent', () => {
    const players = [
      { name: 'Keeper A', position: 'GK', team: 'MIA' },
      { name: 'Keeper B', position: 'GKP', team: 'LAFC' },
      { name: 'Forward C', position: 'FWD', team: 'NYC' },
    ]

    const keepers = filterByPosition(players, 'GK')
    expect(keepers.map((p) => p.name)).toEqual(expect.arrayContaining(['Keeper A', 'Keeper B']))
    expect(keepers.map((p) => p.name)).not.toContain('Forward C')
  })
})

