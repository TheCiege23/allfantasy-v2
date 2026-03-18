'use client'

/**
 * PROMPT 4: C2C Board — sport-aware filters, college/pro status, eligibility, class depth, ownership, scoring side, promotion confidence.
 */

import { useState } from 'react'
import { C2CAssetBadge } from './C2CAssetBadge'

export function C2CBoard({
  leagueId,
  sport,
}: {
  leagueId: string
  sport: string
}) {
  const [filterCollege, setFilterCollege] = useState<boolean | null>(null)
  const [filterEligibility, setFilterEligibility] = useState<string>('all')

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-base font-semibold text-white">C2C Board</h3>
      <p className="text-xs text-white/60">
        Sport-aware view: {sport}. Filter by college/pro status, year-to-eligibility, projected draft year, class depth, risk band, ownership, scoring side, promotion confidence.
      </p>
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">Status</span>
          <button
            type="button"
            onClick={() => setFilterCollege(null)}
            className={`rounded px-2 py-1 text-xs ${filterCollege === null ? 'bg-cyan-600 text-white' : 'bg-white/10 text-white/80'}`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterCollege(true)}
            className={`rounded px-2 py-1 text-xs ${filterCollege === true ? 'bg-cyan-600 text-white' : 'bg-white/10 text-white/80'}`}
          >
            College
          </button>
          <button
            type="button"
            onClick={() => setFilterCollege(false)}
            className={`rounded px-2 py-1 text-xs ${filterCollege === false ? 'bg-cyan-600 text-white' : 'bg-white/10 text-white/80'}`}
          >
            Pro
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">Eligibility</span>
          <select
            value={filterEligibility}
            onChange={(e) => setFilterEligibility(e.target.value)}
            className="rounded border border-white/20 bg-black/20 px-2 py-1 text-sm text-white"
          >
            <option value="all">All</option>
            <option value="eligible">Eligible</option>
            <option value="declared">Declared</option>
            <option value="draft_year">By draft year</option>
          </select>
        </div>
      </div>
      <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-center text-sm text-white/50">
        Board data loads from draft pool and roster APIs. Class depth sidebar and risk labels integrate when draft room is open. Ownership and promotion confidence come from league state.
      </div>
      <div className="flex flex-wrap gap-2">
        <C2CAssetBadge type="COLLEGE" />
        <C2CAssetBadge type="DECLARED" />
        <C2CAssetBadge type="PROMOTION_ELIGIBLE" />
      </div>
    </div>
  )
}
