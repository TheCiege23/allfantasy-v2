import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { DevyRosterClient } from './DevyRosterClient'

export const dynamic = 'force-dynamic'

export default async function DevyRosterPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/devy/${leagueId}/roster`)}`)
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { afCommissionerSub: true },
  })

  return (
    <div className="min-h-screen bg-[#040915]">
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#0c0c1e]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
          <Link
            href={`/league/${leagueId}`}
            className="text-[12px] font-semibold text-cyan-300/90 hover:text-cyan-200"
            data-testid="devy-roster-back"
          >
            ← League
          </Link>
          <span className="truncate text-[13px] font-bold text-white">Devy roster</span>
          <span className="w-12" />
        </div>
      </header>
      <DevyRosterClient
        leagueId={leagueId}
        userId={session.user.id}
        hasAfSub={profile?.afCommissionerSub ?? false}
      />
    </div>
  )
}
