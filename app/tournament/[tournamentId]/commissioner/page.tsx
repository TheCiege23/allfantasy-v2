import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  getLegacyTournamentAccess,
  canViewCommissionerDashboard,
} from '@/lib/tournament/legacyTournamentAccess'
import { TournamentCommissionerPageShell } from './TournamentCommissionerPageShell'

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
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/tournament/${tournamentId}/commissioner`)}`)
  }

  const access = await getLegacyTournamentAccess(userId, tournamentId)
  if (!canViewCommissionerDashboard(access)) {
    redirect(`/tournament/${tournamentId}`)
  }

  return <TournamentCommissionerPageShell tournamentId={tournamentId} />
}
