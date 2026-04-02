import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardShell } from '@/app/dashboard/DashboardShell'

export const dynamic = 'force-dynamic'

export default async function LeaguePage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string; name?: string | null; email?: string | null }
  } | null

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/league/${leagueId}`)}`)
  }

  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    include: { teams: true },
  })

  if (!league) {
    redirect('/dashboard')
  }

  const userId = session.user.id
  const isOwner = league.userId === userId
  const userTeam = league.teams.find((t) => t.claimedByUserId === userId)
  if (!isOwner && !userTeam) {
    redirect('/dashboard')
  }

  return (
    <DashboardShell
      userId={userId}
      userName={session.user.name ?? session.user.email ?? 'Manager'}
      activeLeagueId={leagueId}
    />
  )
}
