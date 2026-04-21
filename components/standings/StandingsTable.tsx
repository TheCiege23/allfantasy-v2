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
  /** H2H-category mode only; 0 for points-mode leagues. */
  categoryWinsFor?: number
  categoryLossesFor?: number
  categoryTiesFor?: number
}

type Props = {
  rows: StandingsRow[]
  /**
   * Scoring mode drives which columns render. `h2h_category` (and `roto`)
   * add a "CAT" column showing cumulative category wins-losses-ties; the
   * primary sort key in category-mode leagues.
   */
  scoringMode?: 'points' | 'h2h_category' | 'roto'
}

export default function StandingsTable({ rows, scoringMode = 'points' }: Props) {
  const showCategories = scoringMode === 'h2h_category' || scoringMode === 'roto'
  // Grid columns: # / Team / W-L-T / [CAT W-L-T] / PF / PA / Seed
  const gridCols = showCategories
    ? 'grid-cols-[44px_1fr_repeat(5,minmax(0,1fr))]'
    : 'grid-cols-[48px_1fr_repeat(4,minmax(0,1fr))]'

  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a1228]/90"
      data-testid="standings-table"
      data-scoring-mode={scoringMode}
    >
      <div
        className={`grid ${gridCols} gap-2 border-b border-white/10 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-white/45 sm:text-[11px]`}
      >
        <div>#</div>
        <div>Team</div>
        <div className="text-right">W-L-T</div>
        {showCategories ? (
          <div
            className="text-right text-cyan-200/80"
            title="Cumulative category wins-losses-ties (primary standings sort key)"
            data-testid="standings-header-cat"
          >
            CAT W-L-T
          </div>
        ) : null}
        <div className="text-right">PF</div>
        <div className="text-right">PA</div>
        <div className="text-right hidden sm:block">Seed</div>
      </div>
      <ul>
        {rows.map((r) => (
          <li
            key={r.rosterId}
            className={`grid ${gridCols} gap-2 border-b border-white/5 px-4 py-3 text-sm text-white/90 last:border-0`}
            data-testid={`standings-row-${r.rosterId}`}
          >
            <span className="font-mono text-xs text-white/50">{r.rank ?? '—'}</span>
            <span className="truncate font-medium">{r.teamName}</span>
            <span className="text-right tabular-nums text-white/80">
              {r.wins}-{r.losses}-{r.ties}
            </span>
            {showCategories ? (
              <span
                className="text-right tabular-nums font-semibold text-cyan-200"
                data-testid={`standings-cat-${r.rosterId}`}
              >
                {r.categoryWinsFor ?? 0}-{r.categoryLossesFor ?? 0}-{r.categoryTiesFor ?? 0}
              </span>
            ) : null}
            <span className="text-right tabular-nums text-cyan-200/90">{r.pointsFor.toFixed(2)}</span>
            <span className="text-right tabular-nums text-white/60">{r.pointsAgainst.toFixed(2)}</span>
            <span className="text-right text-xs text-white/45 hidden sm:block">
              {r.rank != null && r.rank <= 6 ? r.rank : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
