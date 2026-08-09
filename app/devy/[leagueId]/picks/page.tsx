import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DevyPicksClient } from './DevyPicksClient'

export const dynamic = 'force-dynamic'

export default async function DevyPicksPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/devy/${leagueId}/picks`)}`)
  }
  return <DevyPicksClient leagueId={leagueId} userId={session.user.id} />
}
