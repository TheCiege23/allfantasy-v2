import Link from 'next/link'

export default function AppHomePage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-2xl font-semibold">AllFantasy WebApp</h1>
        <p className="mt-2 text-sm text-white/65">
          Shared-shell entry for leagues, roster management, waivers, trades, and draft workflows.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/leagues" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Open Leagues</Link>
          <Link href="/app/leagues" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Product League Router</Link>
          <Link href="/app/discover" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">League Discovery</Link>
          <Link href="/app/power-rankings" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Power Rankings</Link>
          <Link href="/app/simulation-lab" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Simulation Lab</Link>
          <Link href="/app/advantage" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Advantage Dashboard</Link>
          <Link href="/app/coach" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Coach Mode</Link>
          <Link href="/app/share-achievements" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Share achievements</Link>
          <Link href="/app/meta-insights" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Meta Insights</Link>
          <Link href="/app/strategy-meta" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Strategy Meta</Link>
          <Link href="/app/dynasty-insights" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Dynasty Intelligence</Link>
          <Link href="/app/trend-feed" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Player Trend Feed</Link>
          <Link href="/messages" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Messages</Link>
          <Link href="/wallet" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Wallet</Link>
          <Link href="/settings" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Settings</Link>
        </div>
      </section>
    </main>
  )
}
