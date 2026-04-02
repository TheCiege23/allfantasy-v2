import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function LeaguePage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/league/${leagueId}`)}`)
  }

  // Placeholder until LeagueShell is built (LEAGUE_PAGE_TASK.md)
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07071a]">
      <div className="text-center">
        <p className="mb-2 text-sm text-white/50">League</p>
        <p className="text-lg font-bold text-white">{leagueId}</p>
        <p className="mt-4 text-xs text-white/30">Full league page coming in next phase</p>
      </div>
    </div>
  )
}
