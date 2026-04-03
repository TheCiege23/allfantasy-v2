/**
 * Bridge: when starting a draft in a keeper league, run keeper draft prep first.
 */
import { prepareKeeperDraft } from '@/lib/keeper/draftIntegration'
import type { KeeperDraftPrep } from '@/lib/keeper/types'

export async function prepareDraftWithKeeperIntegration(
  leagueId: string,
  redraftSeasonId: string,
): Promise<KeeperDraftPrep | null> {
  const league = await import('@/lib/prisma').then((m) =>
    m.prisma.league.findFirst({ where: { id: leagueId }, select: { leagueType: true } }),
  )
  if (league?.leagueType !== 'keeper') return null
  return prepareKeeperDraft(leagueId, redraftSeasonId)
}
