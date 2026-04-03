import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DraftShell } from '../../components/DraftShell'
import { sessionKeyLive } from '@/lib/draft/session-key'

export const dynamic = 'force-dynamic'

export default async function LiveDraftPage({ params }: { params: { leagueId: string } }) {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string; name?: string | null }
  } | null
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/dashboard')
  }

  const league = await prisma.league.findFirst({
    where: {
      id: params.leagueId,
      OR: [{ userId: session.user.id }, { teams: { some: { claimedByUserId: session.user.id } } }],
    },
    select: { id: true, userId: true },
  })
  if (!league) {
    redirect('/dashboard')
  }

  return (
    <DraftShell
      mode="live"
      sessionId={sessionKeyLive(league.id)}
      leagueId={league.id}
      roomId={null}
      userId={session.user.id}
      userName={session.user.name ?? 'Manager'}
      inviteCode={null}
      isCommissioner={league.userId === session.user.id}
    />
  )
}
