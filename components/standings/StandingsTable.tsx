'use client'

export type StandingsRow = {
  rosterId: string
  teamName: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  rank: number | null
}

type Props = {
  rows: StandingsRow[]
}

export default function StandingsTable({ rows }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a1228]/90">
      <div className="grid grid-cols-[48px_1fr_repeat(4,minmax(0,1fr))] gap-2 border-b border-white/10 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-white/45 sm:text-[11px]">
        <div>#</div>
        <div>Team</div>
        <div className="text-right">W-L-T</div>
        <div className="text-right">PF</div>
        <div className="text-right">PA</div>
        <div className="text-right hidden sm:block">Seed</div>
      </div>
      <ul>
        {rows.map((r) => (
          <li
            key={r.rosterId}
            className="grid grid-cols-[48px_1fr_repeat(4,minmax(0,1fr))] gap-2 border-b border-white/5 px-4 py-3 text-sm text-white/90 last:border-0"
            data-testid={`standings-row-${r.rosterId}`}
          >
            <span className="font-mono text-xs text-white/50">{r.rank ?? '—'}</span>
            <span className="truncate font-medium">{r.teamName}</span>
            <span className="text-right tabular-nums text-white/80">
              {r.wins}-{r.losses}-{r.ties}
            </span>
            <span className="text-right tabular-nums text-cyan-200/90">{r.pointsFor.toFixed(2)}</span>
            <span className="text-right tabular-nums text-white/60">{r.pointsAgainst.toFixed(2)}</span>
            <span className="text-right text-xs text-white/45 hidden sm:block">{r.rank != null && r.rank <= 6 ? r.rank : '—'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
