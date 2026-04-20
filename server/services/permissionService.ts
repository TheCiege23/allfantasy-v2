/**
 * Role-based permissions for canonical leagues (commissioner, co-commissioner, member, viewer).
 * Composes with `lib/league/permissions.ts` and `lib/league-access.ts`.
 */

import { prisma } from '@/lib/prisma'
import {
  getLeagueRole,
  type LeagueRole,
} from '@/lib/league/permissions'
import { resolveLeagueAccess } from '@/lib/league-access'

export type { LeagueRole }

export async function isHeadCommissioner(leagueId: string, userId: string | undefined | null): Promise<boolean> {
  if (!userId) return false
  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: { userId: true },
  })
  return league?.userId === userId
}

/** Commissioner (owner) or co-commissioner — elevated league controls. */
export async function isElevatedCommissioner(leagueId: string, userId: string | undefined | null): Promise<boolean> {
  if (!userId) return false
  if (await isHeadCommissioner(leagueId, userId)) return true
  const role = await getLeagueRole(leagueId, userId)
  return role === 'co_commissioner'
}

export async function canViewLeague(leagueId: string, userId: string | undefined | null): Promise<boolean> {
  const access = await resolveLeagueAccess(leagueId, userId ?? undefined)
  return Boolean(access?.isMember)
}

export async function canEditSettings(leagueId: string, userId: string | undefined | null): Promise<boolean> {
  const role = await getLeagueRole(leagueId, userId ?? '')
  return role === 'commissioner' || role === 'co_commissioner'
}

export async function canStartDraft(leagueId: string, userId: string | undefined | null): Promise<boolean> {
  return isElevatedCommissioner(leagueId, userId)
}

export async function canOverrideWaivers(leagueId: string, userId: string | undefined | null): Promise<boolean> {
  return isElevatedCommissioner(leagueId, userId)
}

export async function canRunAutomation(leagueId: string, userId: string | undefined | null): Promise<boolean> {
  return isElevatedCommissioner(leagueId, userId)
}

export async function canEditRoster(leagueId: string, userId: string | undefined | null): Promise<boolean> {
  const role = await getLeagueRole(leagueId, userId ?? '')
  if (role === 'viewer') return false
  return role !== null
}

export async function canApproveTrades(leagueId: string, userId: string | undefined | null): Promise<boolean> {
  return isElevatedCommissioner(leagueId, userId)
}

export async function canDeleteOrArchiveLeague(leagueId: string, userId: string | undefined | null): Promise<boolean> {
  return isHeadCommissioner(leagueId, userId)
}

export async function canDestructiveCommissionerAction(leagueId: string, userId: string | undefined | null): Promise<boolean> {
  return isHeadCommissioner(leagueId, userId)
}
