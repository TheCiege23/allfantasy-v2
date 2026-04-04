import ZombieLeagueShell from './ZombieLeagueShell'

export default async function ZombieLeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ leagueId: string }>
}) {
  const { leagueId } = await params
  return (
    <div className="min-h-screen bg-[var(--zombie-bg)] text-[var(--zombie-text-mid)] antialiased">
      <ZombieLeagueShell leagueId={leagueId}>{children}</ZombieLeagueShell>
    </div>
  )
}
