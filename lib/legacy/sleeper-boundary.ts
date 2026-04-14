import { prisma } from '@/lib/prisma'

type SleeperBoundaryResult =
  | { ok: true }
  | {
      ok: false
      status: number
      message: string
      leagueId?: string
      platform?: string
    }

/**
 * Guardrail for Sleeper-only legacy tools:
 * - If leagueId maps to an AF league and platform is not sleeper, reject.
 * - If leagueId is unknown to AF (pure Sleeper id), allow.
 */
export async function assertSleeperBoundaryForLeagueId(leagueId: string): Promise<SleeperBoundaryResult> {
  const normalized = String(leagueId || '').trim()
  if (!normalized) {
    return { ok: false, status: 400, message: 'leagueId is required' }
  }

  const afLeague = await prisma.league.findFirst({
    where: {
      OR: [{ id: normalized }, { platformLeagueId: normalized }],
    },
    select: {
      id: true,
      platform: true,
      platformLeagueId: true,
    },
  })

  if (!afLeague) {
    return { ok: true }
  }

  if (afLeague.platform !== 'sleeper') {
    return {
      ok: false,
      status: 400,
      message:
        'This tool only supports Sleeper leagues. Use AllFantasy-native league tools for non-Sleeper leagues.',
      leagueId: afLeague.id,
      platform: afLeague.platform,
    }
  }

  return { ok: true }
}
