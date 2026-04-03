import type { RosterSlot } from '@/lib/draft/positions'

export type DraftPlayerLite = {
  id: string
  fullName: string
  position: string
  adp: number | null
}

function randomJitter(adp: number | null, spread = 10): number {
  const base = adp ?? 200
  return base + Math.floor((Math.random() - 0.5) * spread * 2)
}

/**
 * Simple deterministic-ish AI pick for mock drafts (CPU teams).
 */
export function getAIPick(
  _slot: number,
  availablePlayers: DraftPlayerLite[],
  teamNeeds: Record<string, number>,
  _rosterSlots: RosterSlot[],
  _sport: string,
  round: number,
): DraftPlayerLite {
  const pool = availablePlayers.filter((p) => p.id)
  if (pool.length === 0) {
    return { id: 'unknown', fullName: 'Unknown', position: '—', adp: null }
  }

  const sorted = [...pool].sort((a, b) => {
    const ra = randomJitter(a.adp)
    const rb = randomJitter(b.adp)
    return ra - rb
  })

  if (round <= 2) {
    return sorted[0]!
  }

  const needEntries = Object.entries(teamNeeds).filter(([, n]) => n > 0)
  if (needEntries.length > 0) {
    const pos = needEntries[0]![0]
    const byPos = sorted.find((p) => p.position === pos || p.position.includes(pos))
    if (byPos) return byPos
  }

  return sorted[0]!
}
