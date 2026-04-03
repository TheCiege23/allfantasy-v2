import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DraftRoom } from '../../components/DraftRoom'
import { sessionKeyLive } from '@/lib/draft/session-key'

export const dynamic = 'force-dynamic'

export default async function LiveDraftByDraftIdPage({ params }: { params: { draftId: string } }) {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string; name?: string | null }
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
    where: {
      id: param,
      league: leagueAccess,
    },
    select: { leagueId: true },
  })

  const byLeagueAsLegacy = bySession
    ? null
    : await prisma.league.findFirst({
        where: { id: param, ...leagueAccess },
        select: { id: true },
      })

  let leagueId: string | null = bySession?.leagueId ?? byLeagueAsLegacy?.id ?? null

  if (!leagueId) {
    redirect('/dashboard')
  }

  const league = await prisma.league.findFirst({
    where: { id: leagueId, ...leagueAccess },
    select: { id: true, userId: true, bestBallMode: true, sport: true },
  })
  if (!league) {
    redirect('/dashboard')
  }

  return (
    <DraftRoom
      mode="live"
      sessionId={sessionKeyLive(league.id)}
      leagueId={league.id}
      roomId={null}
      userId={uid}
      userName={session.user.name ?? 'Manager'}
      inviteCode={null}
      isCommissioner={league.userId === uid}
      bestBallMode={Boolean(league.bestBallMode)}
      bestBallSport={String(league.sport)}
    />
  )
}
