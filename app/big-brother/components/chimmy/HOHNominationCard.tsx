'use client'

import { useMemo, useState } from 'react'
import type { BigBrotherSummary } from '@/components/big-brother/types'

export function HOHNominationCard({
  leagueId,
  summary,
  onDone,
}: {
  leagueId: string
  summary: BigBrotherSummary
  onDone: () => void
}) {
  const cycle = summary.cycle
  const elig = summary.eligibility?.canBeNominated ?? []
  const names = summary.rosterDisplayNames ?? {}
  const [a, setA] = useState<string | null>(null)
  const [b, setB] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const deadlineLabel = useMemo(() => {
    return cycle?.voteDeadlineAt ? new Date(cycle.voteDeadlineAt).toLocaleString() : 'See commissioner schedule'
  }, [cycle?.voteDeadlineAt])

  if (!cycle?.id) return null

  const submit = async () => {
    if (!a || !b || a === b) {
      setErr('Pick two different managers.')
      return
    }
    if (!window.confirm(`Nominate ${names[a] ?? a} and ${names[b] ?? b}?`)) return
    if (!window.confirm('This locks nominations for the week (per game rules). Continue?')) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/big-brother/nominations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId: cycle.id, nominee1RosterId: a, nominee2RosterId: b }),
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
      className="rounded-xl border border-amber-500/35 bg-[#0a1228] p-4 shadow-lg"
      data-testid="bb-hoh-nomination-card"
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-amber-200/80">Head of Household</p>
      <h3 className="mt-1 text-base font-bold text-white">👑 You are HOH. Make your nominations.</h3>
      <p className="mt-1 text-[12px] text-white/50">Deadline: {deadlineLabel}</p>

      <div className="mt-3 grid max-h-48 grid-cols-2 gap-2 overflow-y-auto">
        {elig.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              if (a === id) setA(null)
              else if (b === id) setB(null)
              else if (!a) setA(id)
              else if (!b) setB(id)
              else {
                setB(id)
              }
            }}
            className={`rounded-lg border px-2 py-2 text-left text-[12px] transition-colors ${
              a === id || b === id
                ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-100'
                : 'border-white/10 bg-white/[0.04] text-white/85 hover:border-white/20'
            }`}
          >
            {names[id] ?? id.slice(0, 8)}
          </button>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-white/40">
        Selected: {a ? names[a] ?? a : '—'} · {b ? names[b] ?? b : '—'}
      </p>

      {err ? <p className="mt-2 text-[12px] text-rose-300">{err}</p> : null}

      <button
        type="button"
        disabled={busy || !a || !b}
        onClick={() => void submit()}
        className="mt-3 w-full rounded-xl bg-cyan-600/40 py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
        data-testid="bb-confirm-nominations"
      >
        {busy ? 'Submitting…' : 'Confirm Nominations'}
      </button>
    </div>
  )
}
