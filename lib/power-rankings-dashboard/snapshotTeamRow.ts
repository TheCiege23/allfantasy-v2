/** Shape stored in `LeaguePowerRankingSnapshot.teams` JSON */
export type SnapshotTeamRow = {
  rank: number
  teamName: string
  externalId: string | null
  powerScore: number
  rankDelta: number | null
  prevRank: number | null
  momentumLabel?: string
  tier?: string
  pointsFor?: number
  pointsAgainst?: number
  record?: { wins: number; losses: number; ties: number }
  isCurrentUser?: boolean
}

export function parseMyRankFromSnapshotTeams(teams: unknown): number | null {
  if (!Array.isArray(teams)) return null
  for (const row of teams) {
    if (!row || typeof row !== 'object') continue
    const r = row as SnapshotTeamRow
    if (r.isCurrentUser === true && typeof r.rank === 'number') return r.rank
  }
  return null
}

export function parseRankForTeamExternalId(teams: unknown, externalId: string | null): number | null {
  if (!externalId || !String(externalId).trim()) return null
  const want = String(externalId).trim()
  if (!Array.isArray(teams)) return null
  for (const row of teams) {
    if (!row || typeof row !== 'object') continue
    const r = row as SnapshotTeamRow
    if (r.externalId != null && String(r.externalId).trim() === want && typeof r.rank === 'number') {
      return r.rank
    }
  }
  return null
}

/** Oldest → newest within the last `maxPoints` saved snapshots (by recency). */
export function buildRankTrailForExternalId(
  snapshots: Array<{ teams: unknown; computedAt: Date }>,
  externalId: string | null,
  maxPoints: number,
): number[] {
  if (!externalId) return []
  const sortedNewestFirst = [...snapshots].sort((a, b) => b.computedAt.getTime() - a.computedAt.getTime())
  const slice = sortedNewestFirst.slice(0, maxPoints)
  const chronological = slice.sort((a, b) => a.computedAt.getTime() - b.computedAt.getTime())
  const ranks: number[] = []
  for (const s of chronological) {
    const r = parseRankForTeamExternalId(s.teams, externalId)
    if (r != null) ranks.push(r)
  }
  return ranks
}

/** Oldest → newest within the last `maxPoints` saved snapshots (by recency). */
export function buildMyRankTrailFromSnapshots(
  snapshots: Array<{ teams: unknown; computedAt: Date }>,
  maxPoints: number,
): number[] {
  const sortedNewestFirst = [...snapshots].sort((a, b) => b.computedAt.getTime() - a.computedAt.getTime())
  const slice = sortedNewestFirst.slice(0, maxPoints)
  const chronological = slice.sort((a, b) => a.computedAt.getTime() - b.computedAt.getTime())
  const ranks: number[] = []
  for (const s of chronological) {
    const r = parseMyRankFromSnapshotTeams(s.teams)
    if (r != null) ranks.push(r)
  }
  return ranks
}
