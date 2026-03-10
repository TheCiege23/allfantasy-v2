import Link from 'next/link'
import { Trophy } from 'lucide-react'

export default function StandingsTab() {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 inline-flex rounded-lg border border-white/15 bg-black/30 p-2">
        <Trophy className="h-4 w-4 text-cyan-300" />
      </div>
      <h3 className="text-sm font-semibold text-white">Standings</h3>
      <p className="mt-1 text-xs text-white/60">Track ranking movement, max-possible scores, and leaderboard pressure.</p>
      <Link href="/brackets" className="mt-3 inline-flex rounded-lg border border-cyan-400/40 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20">
        View Leaderboards
      </Link>
    </section>
  )
}
