import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { DashboardShell } from '@/app/dashboard/DashboardShell'

export const dynamic = 'force-dynamic'

export default async function LeaguePage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string; name?: string | null; email?: string | null } } | null

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/league/${leagueId}`)}`)
  }

  return (
    <DashboardShell
      userId={session.user.id}
      userName={session.user.name ?? session.user.email ?? 'Manager'}
      activeLeagueId={leagueId}
    />
  )
}
