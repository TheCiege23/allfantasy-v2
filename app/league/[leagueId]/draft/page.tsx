import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessLeague } from '@/lib/draft/access'
import { getDraftIdFromSettings } from '@/app/league/[leagueId]/components/league-settings-modal-utils'
import { getOrCreateDraftSession } from '@/lib/live-draft-engine/DraftSessionService'
import { autoMaterializeDraftForLeague } from '@/lib/league-setup/autoMaterializeDraftForLeague'
import { ensureRedraftLeagueContract } from '@/lib/redraft-core-contract'
import { triggerDraftPoolPrewarmBackground } from '@/lib/draft-room/ensureDraftPoolReady'

export const dynamic = 'force-dynamic'

export default async function LeagueDraftResolverPage({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  const { leagueId } = await params
  if (!leagueId) redirect('/dashboard')

  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id

  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/league/${leagueId}/draft`)}`)
  }

  const canAccess = await canAccessLeague(leagueId, userId)
  if (!canAccess) redirect('/dashboard')

  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: {
      id: true,
      sport: true,
      leagueSize: true,
      leagueType: true,
      settings: true,
    },
  })

  if (!league) redirect('/dashboard')

  const sleeperDraftId = getDraftIdFromSettings(league.settings)

  await ensureRedraftLeagueContract(leagueId).catch((error) => {
    console.warn('[league-draft-resolver] redraft contract repair failed', {
      leagueId,
      error: error instanceof Error ? error.message : String(error),
    })
  })

  const { session: draftSession } = await getOrCreateDraftSession(leagueId)

  const updatedDraftSession = await prisma.draftSession.update({
    where: { id: draftSession.id },
    data: {
      sportType: String(league.sport),
      ...(draftSession.status === 'pre_draft'
        ? {
            teamCount: league.leagueSize ?? draftSession.teamCount,
          }
        : {}),
      ...(sleeperDraftId
        ? {
            sleeperDraftId,
          }
        : {}),
    },
    select: {
      id: true,
      status: true,
    },
  })

  if (updatedDraftSession.status === 'pre_draft') {
    await autoMaterializeDraftForLeague(leagueId).catch((error) => {
      console.warn('[league-draft-resolver] auto materialize failed', {
        leagueId,
        error: error instanceof Error ? error.message : String(error),
      })
    })
  }

  triggerDraftPoolPrewarmBackground(leagueId)

  redirect(`/drafts/${encodeURIComponent(updatedDraftSession.id)}`)
}
