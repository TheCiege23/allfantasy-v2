'use client'

import { useState } from 'react'

type PoolTab = 'ALL' | 'OFFENSE' | 'DEFENSE'
type DefSub = 'DL' | 'LB' | 'DB' | 'ALL'
type Tier = 1 | 2 | 3 | 4

const TIER_BORDER: Record<Tier, string> = {
  1: 'border-l-[color:var(--idp-td)]',
  2: 'border-l-[color:var(--idp-offense)]',
  3: 'border-l-emerald-500',
  4: 'border-l-white/25',
}

export function IDPDraftFilters() {
  const [tab, setTab] = useState<PoolTab>('ALL')
  const [defSub, setDefSub] = useState<DefSub>('ALL')
  const [sort, setSort] = useState<'proj' | 'adp' | 'name' | 'team'>('proj')
  const [lbScarcity] = useState(true)

  const rows = [
    { rank: 4, name: 'Elite LB', team: 'BUF', pos: 'LB', role: 'Run Stopper', proj: 16.2, tier: 1 as Tier },
    { rank: 11, name: 'Edge DE', team: 'DAL', pos: 'DL', role: 'Edge Rusher', proj: 14.1, tier: 2 as Tier },
    { rank: 28, name: 'Box S', team: 'KC', pos: 'DB', role: 'Hybrid', proj: 11.4, tier: 3 as Tier },
  ]

  return (
    <div className="space-y-3 rounded-xl border border-[color:var(--idp-border)] bg-[color:var(--idp-panel)] p-4">
      <div className="flex flex-wrap gap-1 border-b border-white/[0.06] pb-3">
        {(['ALL', 'OFFENSE', 'DEFENSE'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${
              tab === t
                ? t === 'OFFENSE'
                  ? 'bg-[color:var(--idp-offense)]/25 text-blue-100'
                  : t === 'DEFENSE'
                    ? 'bg-[color:var(--idp-defense)]/25 text-red-100'
                    : 'bg-violet-500/25 text-violet-100'
                : 'text-white/45 hover:bg-white/[0.04]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'DEFENSE' ? (
        <>
          {lbScarcity ? (
            <div className="rounded-lg border border-amber-500/35 bg-amber-950/30 px-3 py-2 text-[11px] font-semibold text-amber-100">
              🔥 LB SCARCITY — fewer than 30% of starter-tier LBs remain. Prioritize LB early.
            </div>
          ) : null}
          <div className="flex flex-wrap gap-1">
            {(['DL', 'LB', 'DB', 'ALL'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDefSub(d === 'ALL' ? 'ALL' : d)}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                  defSub === d ? 'border-amber-400/50 bg-amber-500/15 text-amber-50' : 'border-white/10 text-white/45'
                }`}
              >
                {d === 'ALL' ? 'ALL DEF' : d}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-white/40">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-md border border-white/15 bg-black/40 px-2 py-1 text-[11px] text-white"
            >
              <option value="proj">Projected IDP pts</option>
              <option value="adp">ADP</option>
              <option value="name">Name</option>
              <option value="team">Team</option>
            </select>
          </div>
          <ul className="space-y-2">
            {rows.map((r) => (
              <li
                key={r.name}
                className={`flex items-center gap-3 rounded-lg border border-white/[0.06] border-l-4 bg-white/[0.03] pl-2 pr-3 py-2 ${TIER_BORDER[r.tier]} ${
                  r.pos === 'LB' && lbScarcity ? 'bg-amber-500/10' : ''
                }`}
              >
                <span className="w-6 text-center text-[11px] text-white/40">{r.rank}</span>
                <div className="h-9 w-9 rounded-full bg-white/10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">{r.name}</p>
                  <p className="text-[10px] text-white/45">
                    {r.team} · {r.pos} · {r.role}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-[color:var(--idp-defense)]">{r.proj}</p>
                  <p className="text-[9px] text-white/35">T{r.tier}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-white/35">
            Drafted players grey out with team logo — wire when draft pick stream is connected.
          </p>
        </>
      ) : (
        <p className="text-xs text-white/45">
          {tab === 'ALL'
            ? 'Showing full player pool. Switch to Defense for IDP-specific filters and tier borders.'
            : 'Offense pool uses your existing draft board (placeholder).'}
        </p>
      )}
    </div>
  )
}
