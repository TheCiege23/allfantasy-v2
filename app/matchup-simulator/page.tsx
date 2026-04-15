import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildSeoMeta } from '@/lib/seo'
import { MatchupSimulatorClient } from './MatchupSimulatorClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildSeoMeta({
  title: 'Matchup Simulator – AllFantasy',
  description: 'Simulate your fantasy matchup with AI-powered projections, injury adjustments, and win probability.',
})

export default async function MatchupSimulatorPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}) {
  const sp = searchParams instanceof Promise ? await searchParams : searchParams ?? {}
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/matchup-simulator')
  }

  const leagueIdParam = typeof sp.leagueId === 'string' ? sp.leagueId : undefined
  const sportParam = typeof sp.sport === 'string' ? sp.sport : 'NFL'

  const leagues = await prisma.league.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, sport: true },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  }).catch(() => [])

  return (
    <MatchupSimulatorClient
      userId={session.user.id}
      leagues={leagues.map((l) => ({ id: l.id, name: l.name ?? 'League', sport: String(l.sport) }))}
      initialLeagueId={leagueIdParam}
      initialSport={sportParam}
    />
  )
}
