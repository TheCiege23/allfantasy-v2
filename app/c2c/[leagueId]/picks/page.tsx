import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { C2CPicksClient } from './C2CPicksClient'

export const dynamic = 'force-dynamic'

export default async function C2CPicksPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/c2c/${leagueId}/picks`)}`)
  }

  const season = await prisma.redraftSeason.findFirst({
    where: { leagueId },
    orderBy: { createdAt: 'desc' },
    include: { rosters: true },
  })
  const rosterId = season?.rosters?.find((r) => r.ownerId === userId)?.id ?? null

  return (
    <div className="min-h-screen bg-[#040915]">
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#0c0c1e]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
          <Link href={`/league/${leagueId}`} className="text-[12px] font-semibold text-cyan-300/90 hover:text-cyan-200">
            ← League
          </Link>
          <span className="truncate text-[13px] font-bold text-white">C2C Picks</span>
          <span className="w-12" />
        </div>
      </header>
      <C2CPicksClient leagueId={leagueId} rosterId={rosterId} />
    </div>
  )
}
