import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function LiveDraftByDraftIdPage({ params }: { params: { draftId: string } }) {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string }
  } | null
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/dashboard')
  }

  const uid = session.user.id
  const param = params.draftId

  const leagueAccess = {
    OR: [{ userId: uid }, { teams: { some: { claimedByUserId: uid } } }],
  }

  const bySession = await prisma.draftSession.findFirst({
    where: { id: param, league: leagueAccess },
    select: { leagueId: true },
  })

  const byLeagueAsLegacy = bySession
    ? null
    : await prisma.league.findFirst({
        where: { id: param, ...leagueAccess },
        select: { id: true },
      })

  const leagueId = bySession?.leagueId ?? byLeagueAsLegacy?.id ?? null
  if (!leagueId) {
    redirect('/dashboard')
  }

  redirect(`/app/league/${leagueId}/draft`)
}
