import Link from 'next/link'

export default function BracketAICoachTab() {
  return (
    <section className="rounded-xl border border-cyan-400/25 bg-cyan-500/5 p-4">
      <h3 className="text-sm font-semibold text-cyan-200">AI Coach</h3>
      <p className="mt-1 text-xs text-cyan-100/80">
        Matchup probabilities, upset leverage, and uniqueness guidance from your AI stack.
      </p>
      <div className="mt-3 flex gap-2">
        <Link href="/af-legacy?tab=chat" className="rounded-lg border border-cyan-400/40 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20">
          Open AI Coach
        </Link>
      </div>
    </section>
  )
}
