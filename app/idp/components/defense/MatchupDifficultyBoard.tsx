'use client'

export function MatchupDifficultyBoard({
  rows,
}: {
  rows: { playerId: string; name: string; opponent: string; grade: 'easy' | 'avg' | 'tough'; note: string }[]
}) {
  const gLabel = (g: 'easy' | 'avg' | 'tough') =>
    g === 'easy' ? '✅ Easy' : g === 'tough' ? '🔴 Tough' : '⚠ Average'

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0c101a] p-4" data-testid="matchup-difficulty-board">
      <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-white/45">Matchup difficulty</h3>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.playerId} className="rounded-lg border border-white/[0.05] px-3 py-2 text-[11px]">
            <div className="flex justify-between gap-2">
              <span className="font-semibold text-white">{r.name}</span>
              <span className="text-white/50">{r.opponent}</span>
            </div>
            <p className="mt-1 text-[10px] text-white/55">{gLabel(r.grade)}</p>
            <p className="text-[10px] text-white/40">{r.note}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
