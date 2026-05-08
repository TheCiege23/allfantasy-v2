import type { WorldCupLeaderboardRow } from "@/lib/world-cup/types"

export default function WorldCupLeaderboardInsights({
  leaderboard,
}: {
  leaderboard: WorldCupLeaderboardRow[]
}) {
  if (!leaderboard.length) {
    return (
      <div className="mx-4 mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/50">
        Leaderboard insights appear after entries are scored. Make sure you've submitted your picks before the first match begins.
      </div>
    )
  }

  const sorted = [...leaderboard].sort((a, b) => a.rank - b.rank || b.totalScore - a.totalScore)
  const leader = sorted[0]
  const runnerUp = sorted[1] ?? null
  const scoreGap = runnerUp ? Math.max(0, leader.totalScore - runnerUp.totalScore) : 0
  const aliveChampionCount = sorted.filter((r) => r.championStillAlive).length
  const mostCorrect = sorted.reduce((best, row) => (row.correctPicks > best.correctPicks ? row : best), sorted[0])

  let widestGap = 0
  for (let i = 1; i < sorted.length; i++) {
    widestGap = Math.max(widestGap, sorted[i - 1].totalScore - sorted[i].totalScore)
  }

  const closestRace = runnerUp && scoreGap <= 5 ? `${leader.entryName} vs ${runnerUp.entryName}` : null

  return (
    <div className="mx-4 mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/45">
        Leaderboard Insights
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
        <InsightCard label="Current Leader" value={leader.entryName} />
        <InsightCard label="Largest Gap" value={`${widestGap} pts`} />
        <InsightCard label="Entries" value={String(sorted.length)} />
        <InsightCard label="Champions Alive" value={String(aliveChampionCount)} />
        <InsightCard label="Most Correct" value={`${mostCorrect.entryName} (${mostCorrect.correctPicks})`} />
        <InsightCard label="Closest Race" value={closestRace ?? "Not close"} />
      </div>
    </div>
  )
}

function InsightCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2">
      <div className="text-[10px] text-white/40">{label}</div>
      <div className="mt-1 font-bold text-white/85">{value}</div>
    </div>
  )
}
