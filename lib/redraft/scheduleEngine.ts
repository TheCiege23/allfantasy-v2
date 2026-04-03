/**
 * Regular-season schedule: round-robin with rotation; supports bye weeks for odd team counts.
 * When medianGame is true, emits additional synthetic rows with type "median" (caller may persist separately).
 */
export function generateSchedule(
  rosters: { id: string }[],
  totalWeeks: number,
  playoffStartWeek: number,
  sport: string,
  options?: { medianGame?: boolean },
): { week: number; home: string; away: string | null; type: string; sport: string }[] {
  const medianGame = options?.medianGame ?? false
  const regularEnd = Math.min(totalWeeks, Math.max(1, playoffStartWeek - 1))
  const ids = rosters.map((r) => r.id)
  const n = ids.length
  const out: { week: number; home: string; away: string | null; type: string; sport: string }[] = []

  if (n < 2) return out

  const teams = [...ids]
  if (n % 2 === 1) teams.push('__BYE__')

  const m = teams.length
  const roundsPerCycle = m - 1
  const half = m / 2

  let prevPairs: Set<string> = new Set()

  for (let week = 1; week <= regularEnd; week++) {
    const cycleWeek = ((week - 1) % roundsPerCycle) + 1
    const rot = Math.floor((week - 1) / roundsPerCycle)

    const idx = (cycleWeek - 1 + rot) % roundsPerCycle
    const ring = [...teams]
    for (let k = 0; k < idx; k++) {
      const x = ring.pop()
      if (x) ring.splice(1, 0, x)
    }

    const pairs: { a: string; b: string }[] = []
    for (let i = 0; i < half; i++) {
      const a = ring[i]!
      const b = ring[m - 1 - i]!
      pairs.push({ a, b })
    }

    const ordered = [...pairs].sort((p) => {
      const key = `${p.a}:${p.b}`
      const rev = `${p.b}:${p.a}`
      if (prevPairs.has(key) || prevPairs.has(rev)) return 1
      return -1
    })

    prevPairs = new Set(ordered.map((p) => `${p.a}:${p.b}`))

    for (const { a, b } of ordered) {
      if (a === '__BYE__' || b === '__BYE__') {
        const alive = a === '__BYE__' ? b : a
        out.push({ week, home: alive, away: null, type: 'regular', sport })
        continue
      }
      const flip = week % 2 === 0
      const home = flip ? b : a
      const away = flip ? a : b
      out.push({ week, home, away, type: 'regular', sport })
      if (medianGame) {
        out.push({ week, home, away: null, type: 'median', sport })
      }
    }
  }

  return out
}
