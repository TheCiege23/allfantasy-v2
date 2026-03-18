/**
 * Whisperer selection: random or veteran-priority (PROMPT 353). Deterministic.
 */

import { prisma } from '@/lib/prisma'

/**
 * Select one roster as Whisperer. Random: uniform among rosterIds. Veteran: prefer returning (e.g. had roster last season); fallback random.
 */
export function selectWhispererRosterId(
  rosterIds: string[],
  mode: 'random' | 'veteran_priority',
  seed?: number
): string {
  if (rosterIds.length === 0) return ''
  if (rosterIds.length === 1) return rosterIds[0]
  const rng = seed != null ? seededShuffle(rosterIds.length, seed) : () => Math.floor(Math.random() * rosterIds.length)
  if (mode === 'veteran_priority') {
    // Placeholder: treat first half as "veterans" by index; in production use prior-season membership
    const veteranSlice = rosterIds.slice(0, Math.ceil(rosterIds.length / 2))
    return veteranSlice[rng() % veteranSlice.length] ?? rosterIds[0]
  }
  return rosterIds[rng() % rosterIds.length] ?? rosterIds[0]
}

function seededShuffle(n: number, seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s % n
  }
}

export async function selectAndSetWhisperer(leagueId: string, mode: 'random' | 'veteran_priority', seed?: number): Promise<string | null> {
  const rosters = await prisma.roster.findMany({
    where: { leagueId },
    select: { id: true },
  })
  const rosterIds = rosters.map((r) => r.id)
  const whispererId = selectWhispererRosterId(rosterIds, mode, seed)
  if (!whispererId) return null
  await prisma.zombieLeagueTeam.updateMany({
    where: { leagueId },
    data: { status: 'Survivor' },
  })
  await prisma.zombieLeagueTeam.update({
    where: { leagueId_rosterId: { leagueId, rosterId: whispererId } },
    data: { status: 'Whisperer' },
  })
  return whispererId
}
