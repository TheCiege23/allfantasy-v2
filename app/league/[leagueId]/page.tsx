import { redirect } from 'next/navigation'

/** Short URL `/league/:id` → canonical league home at `/app/league/:id` */
export default async function LeagueShortLinkPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params
  redirect(`/app/league/${leagueId}`)
}
