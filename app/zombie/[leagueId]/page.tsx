import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ZombieLeagueHomeClient } from './ZombieLeagueHomeClient'

export default async function ZombieLeagueHomePage({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  const { leagueId } = await params
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  return <ZombieLeagueHomeClient leagueId={leagueId} userId={session?.user?.id ?? null} />
}
