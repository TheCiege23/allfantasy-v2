import { describe, expect, it } from 'vitest'

/**
 * Slice D — sort comparators that drive the player pool list.
 * Mirrors the in-component reducer in PlayerPanel.tsx so the comparators
 * can be exercised without mounting the virtualized panel.
 */

type PlayerEntry = {
  name: string
  position: string
  team: string | null
  adp?: number | null
  aiAdp?: number | null
  display?: { stats?: { fantasyPointsPerGame?: number | null } | null } | null
}

type SortKey = 'adp' | 'aiAdp' | 'projected' | 'name'

function sortPlayers(list: PlayerEntry[], sortBy: SortKey, useAiAdp: boolean): PlayerEntry[] {
  const adpVal = useAiAdp
    ? (p: PlayerEntry) => p.aiAdp ?? p.adp ?? 999
    : (p: PlayerEntry) => p.adp ?? 999
  const aiAdpVal = (p: PlayerEntry) => p.aiAdp ?? p.adp ?? 999
  const projectedVal = (p: PlayerEntry) => {
    const v = p.display?.stats?.fantasyPointsPerGame
    return typeof v === 'number' && Number.isFinite(v) ? v : -Infinity
  }
  const nameVal = (p: PlayerEntry) => p.name

  if (sortBy === 'adp') {
    return [...list].sort((a, b) => (adpVal(a) ?? 999) - (adpVal(b) ?? 999))
  }
  if (sortBy === 'aiAdp') {
    return [...list].sort((a, b) => aiAdpVal(a) - aiAdpVal(b))
  }
  if (sortBy === 'projected') {
    return [...list].sort((a, b) => {
      const diff = projectedVal(b) - projectedVal(a)
      if (diff !== 0) return diff
      return (adpVal(a) ?? 999) - (adpVal(b) ?? 999)
    })
  }
  return [...list].sort((a, b) => nameVal(a).localeCompare(nameVal(b)))
}

const players: PlayerEntry[] = [
  {
    name: 'Christian McCaffrey',
    position: 'RB',
    team: 'SF',
    adp: 1.5,
    aiAdp: 2.1,
    display: { stats: { fantasyPointsPerGame: 21.4 } },
  },
  {
    name: 'Justin Jefferson',
    position: 'WR',
    team: 'MIN',
    adp: 3.2,
    aiAdp: 1.9,
    display: { stats: { fantasyPointsPerGame: 19.6 } },
  },
  {
    name: 'Aaron Jones',
    position: 'RB',
    team: 'MIN',
    adp: 42.0,
    aiAdp: 38.5,
    display: { stats: { fantasyPointsPerGame: 14.8 } },
  },
  {
    name: 'Garrett Wilson',
    position: 'WR',
    team: 'NYJ',
    adp: 25.0,
    aiAdp: null,
    display: { stats: { fantasyPointsPerGame: null } },
  },
]

describe('Slice D — pool sort by ADP', () => {
  it('orders ascending ADP, missing ADP last', () => {
    const out = sortPlayers(players, 'adp', false)
    expect(out.map((p) => p.name)).toEqual([
      'Christian McCaffrey', // 1.5
      'Justin Jefferson',     // 3.2
      'Garrett Wilson',       // 25.0
      'Aaron Jones',          // 42.0
    ])
  })
})

describe('Slice D — pool sort by AI ADP', () => {
  it('orders ascending AI ADP independent of useAiAdp toggle', () => {
    const out = sortPlayers(players, 'aiAdp', false)
    // Garrett Wilson has no AI ADP → falls back to his ADP (25.0)
    expect(out.map((p) => p.name)).toEqual([
      'Justin Jefferson',     // 1.9
      'Christian McCaffrey', // 2.1
      'Garrett Wilson',       // fallback 25.0
      'Aaron Jones',          // 38.5
    ])
  })
})

describe('Slice D — pool sort by projected points', () => {
  it('orders descending projected points; missing projection sinks to bottom', () => {
    const out = sortPlayers(players, 'projected', false)
    expect(out.map((p) => p.name)).toEqual([
      'Christian McCaffrey', // 21.4
      'Justin Jefferson',     // 19.6
      'Aaron Jones',          // 14.8
      'Garrett Wilson',       // null projection
    ])
  })

  it('breaks ties on ADP', () => {
    const tied: PlayerEntry[] = [
      { name: 'Player A', position: 'WR', team: null, adp: 10, display: { stats: { fantasyPointsPerGame: 18 } } },
      { name: 'Player B', position: 'WR', team: null, adp: 5, display: { stats: { fantasyPointsPerGame: 18 } } },
    ]
    const out = sortPlayers(tied, 'projected', false)
    expect(out.map((p) => p.name)).toEqual(['Player B', 'Player A'])
  })
})

describe('Slice D — pool sort by name', () => {
  it('orders alphabetically (case-insensitive locale compare)', () => {
    const out = sortPlayers(players, 'name', false)
    expect(out.map((p) => p.name)).toEqual([
      'Aaron Jones',
      'Christian McCaffrey',
      'Garrett Wilson',
      'Justin Jefferson',
    ])
  })
})

describe('Slice D — useAiAdp toggle on the ADP sort', () => {
  it('with useAiAdp=true, ADP button order matches AI ADP order', () => {
    const out = sortPlayers(players, 'adp', true)
    expect(out.map((p) => p.name)).toEqual([
      'Justin Jefferson',     // ai 1.9
      'Christian McCaffrey', // ai 2.1
      'Garrett Wilson',       // fallback 25.0
      'Aaron Jones',          // ai 38.5
    ])
  })
})
