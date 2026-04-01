import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLeagueHomeData } from '@/lib/data/league-home'
import LeagueHomeClient from '@/components/league/LeagueHomeClient'

export const dynamic = 'force-dynamic'

export default async function AppLeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const [{ leagueId }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id

  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/app/league/${leagueId}`)}`)
  }

  const data = await getLeagueHomeData(leagueId, userId, resolvedSearchParams?.tab)

  if (!data) {
    redirect('/app/home')
  }

  return <LeagueHomeClient data={data} />
}
