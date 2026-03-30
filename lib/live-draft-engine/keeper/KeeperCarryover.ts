import { prisma } from '@/lib/prisma'
import type { KeeperConfig } from './types'

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

function collectNamesFromUnknown(value: unknown, out: Set<string>) {
  if (!value) return
  if (typeof value === 'string') {
    const norm = normalizeName(value)
    if (norm) out.add(norm)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectNamesFromUnknown(item, out)
    }
    return
  }
  if (typeof value === 'object') {
    const row = value as Record<string, unknown>
    const direct =
      (typeof row.playerName === 'string' && row.playerName) ||
      (typeof row.name === 'string' && row.name) ||
      (typeof row.fullName === 'string' && row.fullName) ||
      (typeof row.full_name === 'string' && row.full_name) ||
      null
    if (direct) {
      const norm = normalizeName(direct)
      if (norm) out.add(norm)
    }
    collectNamesFromUnknown(row.players, out)
    collectNamesFromUnknown(row.roster, out)
    collectNamesFromUnknown(row.draftPicks, out)
    collectNamesFromUnknown(row.keepers, out)
    collectNamesFromUnknown(row.carryoverPlayers, out)
  }
}

export function getCarryoverPlayerNameSetFromPlayerData(playerData: unknown): Set<string> {
  const names = new Set<string>()
  collectNamesFromUnknown(playerData, names)
  return names
}

export async function getCarryoverByRosterForLeague(leagueId: string): Promise<Record<string, string[]>> {
  const rosters = await prisma.roster.findMany({
    where: { leagueId },
    select: { id: true, playerData: true },
  })
  const out: Record<string, string[]> = {}
  for (const roster of rosters) {
    const set = getCarryoverPlayerNameSetFromPlayerData(roster.playerData)
    out[roster.id] = Array.from(set).sort()
  }
  return out
}

export function isKeeperDeadlineLocked(config: KeeperConfig | null | undefined, now: Date = new Date()): boolean {
  const deadlineRaw = config?.deadline
  if (!deadlineRaw) return false
  const parsed = new Date(deadlineRaw)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.getTime() <= now.getTime()
}

export function isKeeperEligibleFromCarryover(
  rosterId: string,
  playerName: string,
  carryoverByRoster: Record<string, string[]>
): { eligible: boolean; requiresCarryoverData: boolean } {
  const names = carryoverByRoster[rosterId] ?? []
  if (names.length === 0) {
    return { eligible: true, requiresCarryoverData: false }
  }
  const eligible = names.includes(normalizeName(playerName))
  return { eligible, requiresCarryoverData: true }
}
