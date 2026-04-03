'use client'

export function TradeCenter({ leagueId }: { leagueId: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-[12px] text-white/50">
      Trade center for league <span className="text-white/70">{leagueId}</span> — use GET /api/redraft/trades.
    </div>
  )
}
