import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { loadTournamentLayoutPayload } from '@/lib/tournament/tournamentPageData'
import { TournamentUiProvider } from '@/app/tournament/[tournamentId]/TournamentUiContext'
import { TournamentChrome } from '@/app/tournament/[tournamentId]/TournamentChrome'

export default async function TournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tournamentId: string }>
}) {
  const { tournamentId } = await params
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const data = await loadTournamentLayoutPayload(tournamentId, session?.user?.id ?? null)
  if (!data) notFound()

  return (
    <TournamentUiProvider value={{ ...data, viewerUserId: session?.user?.id ?? null }}>
      <div className="tournament-theme min-h-dvh">
        <TournamentChrome>{children}</TournamentChrome>
      </div>
    </TournamentUiProvider>
  )
}
