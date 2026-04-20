import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import StandingsPage from '@/components/standings/StandingsPage'
import AppShell from '@/app/components/AppShell'

export const dynamic = 'force-dynamic'

export default async function LeagueStandingsPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/league/${leagueId}/standings`)}`)

  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: { season: true },
  })
  if (!league) redirect('/dashboard')

  return (
    <AppShell leftPanel={null} rightPanel={null}>
      <div className="min-h-screen bg-[#040915] text-white">
        <StandingsPage leagueId={leagueId} initialSeason={league.season} />
      </div>
    </AppShell>
  )
}
