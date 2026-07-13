import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import type { Metadata } from 'next'
import { authOptions } from '@/lib/auth'
import { getDashboardLeagueListForUser } from '@/lib/dashboard/get-dashboard-league-list'
import type { UserLeague } from '@/app/dashboard/types'
import { UniversalLeaguesBoard } from './UniversalLeaguesBoard'
import { UniversalDashboardShell } from './components/UniversalDashboardShell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AllFantasy — All Your Leagues',
  description:
    'Every fantasy league you play — across every platform and every sport — in one universal dashboard, with health and next-action insight per league.',
}

/**
 * Universal B2C dashboard (prototype).
 *
 * The consumer "operating system" overview: instead of hopping platform to platform,
 * a manager sees every league they play — Sleeper, ESPN, Yahoo, CBS, MFL, Fantrax,
 * native AllFantasy, tournaments — across every sport in one place, each with a
 * derived health / next-action signal.
 *
 * Runs on the same server-side league source the main dashboard uses
 * (`getDashboardLeagueListForUser`), so it reflects real connected data with no new
 * backend. Deeper Decision OS analysis layers on top of this surface later.
 */
export default async function UniversalDashboardPage() {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string }
  } | null
  const userId = typeof session?.user?.id === 'string' ? session.user.id.trim() : ''
  if (!userId) {
    redirect('/login?callbackUrl=/dashboard/universal')
  }

  const payload = await getDashboardLeagueListForUser(userId).catch(() => null)
  const leagues = (payload?.leagues ?? []) as UserLeague[]

  return (
    <UniversalDashboardShell leagues={leagues}>
      <UniversalLeaguesBoard leagues={leagues} />
    </UniversalDashboardShell>
  )
}
