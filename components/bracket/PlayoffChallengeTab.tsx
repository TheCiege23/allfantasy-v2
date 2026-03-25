import Link from 'next/link'
import { Goal } from 'lucide-react'

export default function PlayoffChallengeTab() {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 inline-flex rounded-lg border border-white/15 bg-black/30 p-2">
        <Goal className="h-4 w-4 text-cyan-300" />
      </div>
      <h3 className="text-sm font-semibold text-white">Playoff Challenge</h3>
      <p className="mt-1 text-xs text-white/60">
        Launch a sport-specific playoff bracket with the right format preselected.
      </p>
      <Link
        href="/brackets/leagues/new?challengeType=playoff_challenge"
        className="mt-3 inline-flex rounded-lg border border-cyan-400/40 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20"
        data-testid="bracket-playoff-challenge-tab-link"
      >
        Start Playoff Challenge
      </Link>
    </section>
  )
}
