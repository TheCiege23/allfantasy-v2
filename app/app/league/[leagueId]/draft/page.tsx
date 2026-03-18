import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { isCommissioner } from '@/lib/commissioner/permissions'
import { DraftRoomPageClient } from '@/components/app/draft-room/DraftRoomPageClient'

export const dynamic = 'force-dynamic'

export default async function LeagueDraftPage({
  params,
}: {
  params: Promise<{ leagueId: string }>,
}) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) redirect('/login')

  const { leagueId } = await params
  if (!leagueId) redirect('/app')

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
