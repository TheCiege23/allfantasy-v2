import type { WorldCupLeaderboardRow } from "@/lib/world-cup/types"

export default function WorldCupLeaderboardInsights({
  leaderboard,
  aiInsightsUnlocked = false,
}: {
  leaderboard: WorldCupLeaderboardRow[]
  aiInsightsUnlocked?: boolean
}) {
  if (!leaderboard.length) {
    return (
      <div className="mx-4 mt-4 space-y-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/50">
          Leaderboard insights appear after finalized entries are scored. Make sure you've submitted your picks before the first match begins.
        </div>
        <LeaderboardAiSummaryCard leaderboard={[]} aiInsightsUnlocked={aiInsightsUnlocked} />
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
      <LeaderboardAiSummaryCard leaderboard={sorted} aiInsightsUnlocked={aiInsightsUnlocked} />
    </div>
  )
}

function LeaderboardAiSummaryCard({
  leaderboard,
  aiInsightsUnlocked,
}: {
  leaderboard: WorldCupLeaderboardRow[]
  aiInsightsUnlocked: boolean
}) {
  const championCounts = new Map<string, number>()
  for (const row of leaderboard) {
    const champion = row.championPickName?.trim()
    if (champion) championCounts.set(champion, (championCounts.get(champion) ?? 0) + 1)
  }
  const commonChampion = [...championCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Not available yet"
  const leader = leaderboard[0] ?? null
  const runnerUp = leaderboard[1] ?? null
  const closeRace = leader && runnerUp && Math.abs(leader.totalScore - runnerUp.totalScore) <= 5
  return (
    <details data-testid="world-cup-leaderboard-ai-summary" className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.055] p-3 text-xs text-cyan-50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-black">
        <span>AI Pool Summary</span>
        <span className="rounded-full border border-cyan-200/25 px-2 py-0.5 text-[10px] uppercase tracking-wide">
          {aiInsightsUnlocked ? "Finalized only" : "Locked"}
        </span>
      </summary>
      {aiInsightsUnlocked ? (
        <div className="mt-3 space-y-2 leading-5 text-cyan-50/85">
          <p><span className="font-black text-white">Finalized-only summary:</span> {leaderboard.length} public leaderboard entr{leaderboard.length === 1 ? "y" : "ies"} included.</p>
          <p><span className="font-black text-white">Most common champion:</span> {commonChampion}.</p>
          <p><span className="font-black text-white">Race note:</span> {closeRace ? "The top two entries are within 5 points." : "No close top-two race yet."}</p>
          <p className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[11px] text-white/55">
            Uses finalized/public leaderboard data only. No private unfinalized picks are included. Bracket guidance stays limited to pool picks and scoring mechanics.
          </p>
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-white/10 bg-black/25 px-2 py-2 text-[11px] leading-5 text-white/60" hidden>
          Upgrade to AI/Pro for finalized-only pool summaries. Locked users do not trigger AI calls.
        </p>
      )}
    </details>
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
