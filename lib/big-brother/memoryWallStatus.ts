/**
 * Derive Big Brother house status for a roster (same priority as `myStatus` in summary API).
 */

export type MemoryWallStatus =
  | 'SAFE'
  | 'HOH'
  | 'NOMINATED'
  | 'VETO_PLAYER'
  | 'VETO_WINNER'
  | 'ELIMINATED'
  | 'JURY'

export function resolveMemoryWallStatus(input: {
  rosterId: string
  cycle: {
    hohRosterId: string | null
    vetoWinnerRosterId: string | null
    vetoParticipantRosterIds: string[] | null
  } | null
  finalNomineeRosterIds: string[]
  eliminatedRosterIds: string[]
  juryRosterIds: string[]
}): MemoryWallStatus {
  const { rosterId, cycle, finalNomineeRosterIds, eliminatedRosterIds, juryRosterIds } = input
  if (eliminatedRosterIds.includes(rosterId)) {
    return juryRosterIds.includes(rosterId) ? 'JURY' : 'ELIMINATED'
  }
  if (cycle?.hohRosterId === rosterId) return 'HOH'
  if (finalNomineeRosterIds.includes(rosterId)) return 'NOMINATED'
  if (cycle?.vetoWinnerRosterId === rosterId) return 'VETO_WINNER'
  if (cycle?.vetoParticipantRosterIds?.includes(rosterId)) return 'VETO_PLAYER'
  return 'SAFE'
}

const STATUS_SORT: Record<MemoryWallStatus, number> = {
  HOH: 0,
  NOMINATED: 1,
  VETO_WINNER: 2,
  VETO_PLAYER: 3,
  SAFE: 4,
  JURY: 5,
  ELIMINATED: 6,
}

export function compareMemoryWallEntries(
  a: { status: MemoryWallStatus; displayName: string },
  b: { status: MemoryWallStatus; displayName: string }
): number {
  const da = STATUS_SORT[a.status] ?? 99
  const db = STATUS_SORT[b.status] ?? 99
  if (da !== db) return da - db
  return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
}
