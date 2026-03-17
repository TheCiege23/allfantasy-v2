/**
 * Roster assignment: after a pick (or on draft complete), update roster state.
 * Draft picks are stored in DraftPick; this service appends to Roster.playerData or
 * a draft snapshot for "current drafted roster view" and final persist on completion.
 */

import { prisma } from '@/lib/prisma'

export interface AssignedPlayer {
  playerName: string
  position: string
  team?: string | null
  playerId?: string | null
  byeWeek?: number | null
}

/**
 * Append a single pick to the roster's draft snapshot (in-memory or stored).
 * For "current drafted roster view" the client can derive from picks by rosterId.
 * Optional: persist a draft_roster_snapshot JSON on League or Roster for quick read.
 */
export async function appendPickToRosterDraftSnapshot(
  leagueId: string,
  rosterId: string,
  player: AssignedPlayer
): Promise<void> {
  const roster = await prisma.roster.findFirst({
    where: { leagueId, id: rosterId },
  })
  if (!roster) return
  const data = (roster.playerData as Record<string, unknown>) ?? {}
  const draftPicks = (data.draftPicks as AssignedPlayer[]) ?? []
  draftPicks.push(player)
  await prisma.roster.update({
    where: { id: rosterId },
    data: { playerData: { ...data, draftPicks } },
  })
}

/**
 * On draft completion: optionally merge draft picks into main roster playerData
 * or leave as draftPicks only. Call after marking session completed.
 */
export async function finalizeRosterAssignments(leagueId: string): Promise<void> {
  const session = await prisma.draftSession.findUnique({
    where: { leagueId },
    include: { picks: { orderBy: { overall: 'asc' } } },
  })
  if (!session || session.status !== 'completed') return

  const byRoster = new Map<string, AssignedPlayer[]>()
  for (const p of session.picks) {
    const list = byRoster.get(p.rosterId) ?? []
    list.push({
      playerName: p.playerName,
      position: p.position,
      team: p.team,
      playerId: p.playerId,
      byeWeek: p.byeWeek,
    })
    byRoster.set(p.rosterId, list)
  }

  for (const [rosterId, players] of byRoster) {
    const roster = await prisma.roster.findFirst({
      where: { leagueId, id: rosterId },
    })
    if (!roster) continue
    const data = (roster.playerData as Record<string, unknown>) ?? {}
    await prisma.roster.update({
      where: { id: rosterId },
      data: { playerData: { ...data, draftPicks: players } },
    })
  }
}
