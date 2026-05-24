import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getDashboardLeagueListForUser } from '@/lib/dashboard/get-dashboard-league-list'
import CommissionerHubPageClient from './CommissionerHubPageClient'

export const metadata: Metadata = {
  title: 'Commissioner Hub | AllFantasy',
  description:
    'Run better leagues. Draft smarter. Build your fantasy legacy. Every tool a commissioner needs to create, manage, and grow their leagues — in one place.',
}

export const dynamic = 'force-dynamic'

export default async function CommissionerHubPage() {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string }
  } | null
  const userId = typeof session?.user?.id === 'string' ? session.user.id.trim() : ''
  if (!userId) redirect('/login?callbackUrl=/commissioner-hub')

  const leagues = await getDashboardLeagueListForUser(userId).catch(() => [])

  return <CommissionerHubPageClient leagues={leagues} />
}
