import { Suspense } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TournamentCommissionerDashboard } from '@/components/tournament/TournamentCommissionerDashboard'
import {
  getLegacyTournamentAccess,
  canViewCommissionerDashboard,
} from '@/lib/tournament/legacyTournamentAccess'

export const dynamic = 'force-dynamic'

export default async function TournamentCommissionerPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>
}) {
  const { tournamentId } = await params
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/app/tournament/${tournamentId}/commissioner`)}`)
  }

  const access = await getLegacyTournamentAccess(userId, tournamentId)
  if (!canViewCommissionerDashboard(access)) {
    redirect(`/tournament/${tournamentId}`)
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/app/tournament" className="inline-flex items-center gap-2 text-white/60 hover:text-white">
          <ChevronLeft className="h-4 w-4" /> Tournaments
        </Link>
      </div>
      <Suspense
        fallback={
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center text-white/55">
            Loading commissioner dashboard…
          </div>
        }
      >
        <TournamentCommissionerDashboard tournamentId={tournamentId} />
      </Suspense>
    </main>
  )
}
