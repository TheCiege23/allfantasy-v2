import { describe, expect, it } from 'vitest'

import { parseFleaflickerSourceId } from '@/lib/league-import/fleaflicker/FleaflickerLeagueFetchService'

describe('parseFleaflickerSourceId', () => {
  it('parses numeric id as NFL', () => {
    const p = parseFleaflickerSourceId('206154')
    expect(p.sport).toBe('NFL')
    expect(p.leagueId).toBe(206154)
  })

  it('parses SPORT:id:season', () => {
    const p = parseFleaflickerSourceId('NBA:99:2023')
    expect(p.sport).toBe('NBA')
    expect(p.leagueId).toBe(99)
    expect(p.season).toBe(2023)
  })
})
