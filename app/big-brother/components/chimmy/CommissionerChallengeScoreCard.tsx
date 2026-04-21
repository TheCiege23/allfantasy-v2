'use client'

import { useState } from 'react'
import type { BigBrotherSummary } from '@/components/big-brother/types'

/** Shown to commissioner during HOH_OPEN or VETO_CHALLENGE_OPEN phases so they can enter weekly scores. */
export function CommissionerChallengeScoreCard({
  leagueId,
  summary,
  onDone,
}: {
  leagueId: string
  summary: BigBrotherSummary
  onDone: () => void
}) {
  const cycle = summary.cycle
  const names = summary.rosterDisplayNames ?? {}
  const phase = cycle?.phase ?? ''

  const isHOH = phase === 'HOH_OPEN'
  const isVeto = phase === 'VETO_CHALLENGE_OPEN'

  // Determine which rosters are competing
  const competitorIds: string[] = isVeto
    ? ((summary.vetoChallenge?.competitorRosterIds ?? (cycle?.vetoParticipantRosterIds as string[] | null) ?? []) as string[])
    : (summary.eligibility?.canCompeteHOH ?? [])

  const [scores, setScores] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!summary.isCommissioner) return null
  if (!isHOH && !isVeto) return null
  if (competitorIds.length === 0) return null

  const submit = async () => {
    const numericScores: Record<string, number> = {}
    for (const [k, v] of Object.entries(scores)) {
      const n = parseFloat(v)
      if (!isNaN(n)) numericScores[k] = n
    }
    if (Object.keys(numericScores).length === 0) {
      setErr('Enter at least one score.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const endpoint = isVeto
        ? `/api/leagues/${encodeURIComponent(leagueId)}/big-brother/veto-challenge`
        : `/api/leagues/${encodeURIComponent(leagueId)}/big-brother/hoh`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores: numericScores }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed')
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="rounded-xl border border-amber-500/30 bg-[#0a1228] p-4 shadow-lg"
      data-testid="bb-commissioner-challenge-score-card"
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-amber-200/70">Commissioner</p>
      <h3 className="mt-1 text-base font-bold text-white">
        {isVeto ? '🏆 Enter Veto Challenge Scores' : '👑 Enter HOH Challenge Scores'}
      </h3>
      <p className="mt-1 text-[12px] text-white/50">
        Enter weekly fantasy scores for each competitor to determine the winner.
      </p>

      <div className="mt-3 space-y-2">
        {competitorIds.map((id) => (
          <div key={id} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[13px] text-white/80">{names[id] ?? id}</span>
            <input
              type="number"
              step="0.01"
              placeholder="pts"
              value={scores[id] ?? ''}
              onChange={(e) => setScores((prev) => ({ ...prev, [id]: e.target.value }))}
              className="w-28 rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1.5 text-right text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-amber-400/40"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="mt-4 w-full rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 text-[13px] font-semibold text-amber-100 disabled:opacity-40"
      >
        {busy ? 'Resolving…' : `Resolve ${isVeto ? 'Veto' : 'HOH'} by Score`}
      </button>

      {err && <p className="mt-2 text-[12px] text-red-400">{err}</p>}
    </div>
  )
}
