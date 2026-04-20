/**
 * Load specialty subsystem rows into a deterministic metadata object for handlers / phase_state.
 */
import { prisma } from '@/lib/prisma'
import type { HandlerContext } from '@/lib/specialty-automation/types'
import type { SpecialtyConceptKey } from '@/lib/specialty-automation/types'

export async function loadSpecialtyMetadataSnapshot(
  conceptKey: SpecialtyConceptKey,
  ctx: HandlerContext,
): Promise<Record<string, unknown>> {
  const meta: Record<string, unknown> = { conceptKey, leagueId: ctx.leagueId }

  if (conceptKey === 'tournament') {
    const tl = await prisma.tournamentLeague.findFirst({
      where: { leagueId: ctx.leagueId },
      select: { id: true, status: true, roundId: true, tournamentId: true, leagueId: true },
    })
    if (tl) meta.tournament = tl
  }

  if (conceptKey === 'zombie') {
    const z = await prisma.zombieLeague.findUnique({
      where: { leagueId: ctx.leagueId },
      select: { id: true, universeId: true, levelId: true, currentWeek: true, status: true },
    })
    if (z) meta.zombie = z
  }

  if (conceptKey === 'devy') {
    const d = await prisma.devyLeague.findUnique({
      where: { leagueId: ctx.leagueId },
      select: { id: true, devySlots: true, taxiSlots: true },
    })
    if (d) meta.devy = d
  }

  if (conceptKey === 'c2c') {
    const c = await prisma.c2CLeague.findUnique({
      where: { leagueId: ctx.leagueId },
      select: { id: true, season: true, scoringMode: true },
    })
    if (c) meta.c2c = c
  }

  if (conceptKey === 'pirate_vampire' || conceptKey === 'royal' || conceptKey === 'king_of_the_hill') {
    meta.extensions = ctx.conceptRules?.extensions ?? {}
  }

  return meta
}
