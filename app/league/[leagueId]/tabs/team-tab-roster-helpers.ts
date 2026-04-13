import type { ExpandedStarterSlot } from '@/lib/league/lineup-expand-template'
import {
  applyLineupPick,
  buildLineupListsFromPlayerData,
  findPlayerLocation,
  playerEligibleForSlot,
  swapPlayersInLists,
  type RosterLineupLists,
} from '@/lib/league/lineup-swap'
import type { PlayerMap } from '@/lib/hooks/useSleeperPlayers'
import type { SwapCandidate } from '@/components/league/TeamLineupSwapModal'

export function rosterSectionBadge(lists: RosterLineupLists, playerId: string): string {
  if (!playerId?.trim()) return '—'
  const loc = findPlayerLocation(lists, playerId)
  if (!loc) return '—'
  if (loc.section === 'starters') return 'S'
  if (loc.section === 'bench') return 'BN'
  if (loc.section === 'ir') return 'IR'
  if (loc.section === 'taxi') return 'TX'
  return 'DV'
}

export function buildPlayerRow(id: string, players: PlayerMap): Record<string, unknown> {
  const p = players[id]
  return {
    id,
    name: p?.name ?? `Player ${id.slice(-4)}`,
    position: p?.position ?? '—',
    team: p?.team ?? '—',
    opponent: '—',
    gameTime: '—',
    projection: 0,
    status: 'healthy',
  }
}

export function buildSwapCandidates(args: {
  lists: RosterLineupLists
  slot: ExpandedStarterSlot
  slotIndex: number
  players: PlayerMap
}): SwapCandidate[] {
  const { lists, slot, slotIndex, players } = args
  const ids = new Set<string>()
  const add = (id: string) => {
    if (id) ids.add(id)
  }
  lists.starters.forEach((id, i) => {
    if (i !== slotIndex) add(id)
  })
  lists.bench.forEach(add)
  lists.ir.forEach(add)
  lists.taxi.forEach(add)
  lists.devy.forEach(add)

  const out: SwapCandidate[] = []
  for (const id of ids) {
    const p = players[id]
    const pos = p?.position ?? ''
    const eligible = playerEligibleForSlot(slot, pos)
    out.push({
      id,
      name: p?.name ?? id,
      position: pos || '—',
      team: p?.team ?? '—',
      eligible,
      badge: rosterSectionBadge(lists, id),
    })
  }
  out.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return out
}

/** Swap any two rostered players (bench / IR / taxi / devy badge flow). */
export function buildReserveSwapCandidates(args: {
  lists: RosterLineupLists
  sourcePlayerId: string
  players: PlayerMap
}): SwapCandidate[] {
  const { lists, sourcePlayerId, players } = args
  const ids = new Set<string>()
  const add = (id: string) => {
    if (id && id !== sourcePlayerId) ids.add(id)
  }
  lists.starters.forEach(add)
  lists.bench.forEach(add)
  lists.ir.forEach(add)
  lists.taxi.forEach(add)
  lists.devy.forEach(add)

  const out: SwapCandidate[] = []
  for (const id of ids) {
    const p = players[id]
    out.push({
      id,
      name: p?.name ?? id,
      position: p?.position ?? '—',
      team: p?.team ?? '—',
      eligible: true,
      badge: rosterSectionBadge(lists, id),
    })
  }
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

export function initOrSyncLineupLists(
  playerData: unknown,
  slots: ExpandedStarterSlot[],
): RosterLineupLists {
  return buildLineupListsFromPlayerData(playerData, slots.length)
}

export { applyLineupPick, swapPlayersInLists, type RosterLineupLists }
