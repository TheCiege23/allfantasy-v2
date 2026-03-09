import { redirect } from 'next/navigation'

export default function AppLeagueAliasPage({ params }: { params: { leagueId: string } }) {
  redirect(`/leagues/${params.leagueId}`)
}
