import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { DraftRoomPageClient } from '@/components/app/draft-room/DraftRoomPageClient'
import { DEFAULT_SPORT, normalizeToSupportedSport } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'

export default async function LeagueDraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string }>,
  searchParams?: Promise<{ e2eAuth?: string; sport?: string; variant?: string }> | { e2eAuth?: string; sport?: string; variant?: string }
}) {
  const { leagueId } = await params
  if (!leagueId) redirect('/app')

  const resolvedSearchParams = searchParams ?? {}
  const resolvedQuery =
    typeof (resolvedSearchParams as Promise<{ e2eAuth?: string; sport?: string; variant?: string }>).then === 'function'
      ? await (resolvedSearchParams as Promise<{ e2eAuth?: string; sport?: string; variant?: string }>)
      : (resolvedSearchParams as { e2eAuth?: string; sport?: string; variant?: string })

  const allowE2EBypass =
    process.env.NODE_ENV !== 'production' &&
    resolvedQuery?.e2eAuth === '1'

  if (allowE2EBypass) {
    const requestedSport = normalizeToSupportedSport(resolvedQuery?.sport)
    const requestedVariant = String(resolvedQuery?.variant ?? '').toUpperCase()
    const formatType = requestedVariant === 'IDP' || requestedVariant === 'DYNASTY_IDP' ? 'IDP' : undefined

    return (
      <div className="min-h-screen">
        <DraftRoomPageClient
          leagueId={leagueId}
          leagueName="E2E Draft League"
          sport={String(requestedSport ?? DEFAULT_SPORT)}
          isDynasty={false}
          isCommissioner={true}
          formatType={formatType}
        />
      </div>
    )
  }

  const [{ authOptions }] = await Promise.all([import('@/lib/auth')])
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id

  if (!userId) redirect('/login')

  const [{ prisma }, { isCommissioner }] = await Promise.all([
    import('@/lib/prisma'),
    import('@/lib/commissioner/permissions'),
  ])

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, name: true, sport: true, isDynasty: true, leagueVariant: true },
  })
  if (!league) redirect('/app')

  const commissioner = await isCommissioner(leagueId, userId)
  const variant = (league.leagueVariant ?? '').toUpperCase()
  const formatType = variant === 'IDP' || variant === 'DYNASTY_IDP' ? 'IDP' : undefined

  return (
    <div className="min-h-screen">
      <DraftRoomPageClient
        leagueId={leagueId}
        leagueName={league.name ?? 'League'}
        sport={String(league.sport ?? 'NFL')}
        isDynasty={league.isDynasty ?? false}
        isCommissioner={commissioner}
        formatType={formatType}
      />
    </div>
  )
}
