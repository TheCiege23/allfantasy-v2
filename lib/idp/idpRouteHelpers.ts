/**
 * Shared helpers for `/api/idp/*` routes — roster membership + IDP row parsing.
 */

import { prisma } from '@/lib/prisma'
import { isIdpPosition, normalizeIdpPosition } from '@/lib/idp-kicker-values'

/** Every player id appearing on any roster in the league (offense + defense). */
export async function getRosteredPlayerIdsInLeague(leagueId: string): Promise<Set<string>> {
  const rows = await prisma.roster.findMany({
    where: { leagueId },
    select: { playerData: true },
  })
  const set = new Set<string>()
  for (const r of rows) {
    if (!Array.isArray(r.playerData)) continue
    for (const raw of r.playerData) {
      if (!raw || typeof raw !== 'object') continue
      const o = raw as Record<string, unknown>
      const pid = String(o.playerId ?? o.id ?? o.sleeperPlayerId ?? '')
      if (pid) set.add(pid)
    }
  }
  return set
}

export type ParsedIdpRosterRow = {
  playerId: string
  name: string
  position: string
  team?: string
}

/** IDP-only rows from Prisma `roster.playerData` JSON (same shape as league shell). */
export function parseIdpRowsFromPlayerData(playerData: unknown): ParsedIdpRosterRow[] {
  if (!Array.isArray(playerData)) return []
  const out: ParsedIdpRosterRow[] = []
  for (const raw of playerData) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    const pid = String(o.playerId ?? o.id ?? o.sleeperPlayerId ?? '')
    const pos = String(o.position ?? o.pos ?? '')
    if (!pid || !isIdpPosition(pos)) continue
    out.push({
      playerId: pid,
      name: String(o.name ?? o.playerName ?? pid).slice(0, 120),
      position: pos.toUpperCase(),
      team: typeof o.team === 'string' ? o.team : undefined,
    })
  }
  return out
}

/** Match Sleeper position to UI filter (DL / LB / DB or granular DE, DT, …). */
export function matchesIdpPositionFilter(playerPosition: string, filter: string): boolean {
  const f = filter.trim().toUpperCase()
  if (!f) return true
  const p = playerPosition.toUpperCase()
  if (f === 'DL') return ['DE', 'DT', 'DL'].includes(p)
  if (f === 'DB') return ['CB', 'S', 'SS', 'FS', 'DB'].includes(p)
  if (f === 'LB') return p === 'LB' || p === 'ILB' || p === 'OLB'
  return p === f || normalizeIdpPosition(p) === normalizeIdpPosition(f)
}
