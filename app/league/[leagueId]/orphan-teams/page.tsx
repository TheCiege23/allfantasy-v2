import OrphanTeamsClient from '@/app/orphan-teams/OrphanTeamsClient'

export const metadata = {
  title: 'Orphaned teams | AllFantasy',
  description: 'Commissioner tools and marketplace for open manager slots.',
}

export default async function LeagueOrphanTeamsPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <OrphanTeamsClient leagueId={leagueId} />
    </main>
  )
}
