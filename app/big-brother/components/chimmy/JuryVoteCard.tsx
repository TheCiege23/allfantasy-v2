'use client'

import { useEffect, useState } from 'react'
import type { BigBrotherSummary } from '@/components/big-brother/types'

export function JuryVoteCard({
  leagueId,
  summary,
  onDone,
}: {
  leagueId: string
  summary: BigBrotherSummary
  onDone: () => void
}) {
  const names = summary.rosterDisplayNames ?? {}
  const [finalists, setFinalists] = useState<string[]>([])
  const [target, setTarget] = useState<string | null>(null)
  const [step, setStep] = useState<'pick' | 'confirm'>('pick')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    void fetch(`/api/leagues/${encodeURIComponent(leagueId)}/big-brother/finalists`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { finalistRosterIds?: string[] }) => setFinalists(d.finalistRosterIds ?? []))
      .catch(() => setFinalists([]))
  }, [leagueId])

  const submit = async () => {
    if (!target) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/big-brother/finale-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRosterId: target }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed')
      setDone(true)
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  if (finalists.length < 2) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-[13px] text-white/50">
        Finale finalists not ready yet.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-500/35 bg-[#0a1228] p-4" data-testid="bb-jury-vote-card">
      <h3 className="text-base font-bold text-white">⚖️ Jury vote for the winner</h3>
      <p className="mt-1 text-[12px] text-white/50">Private ballot — cast once.</p>

      {step === 'pick' ? (
        <div className="mt-3 grid grid-cols-1 gap-2">
          {finalists.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTarget(id)
                setStep('confirm')
              }}
              className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-left text-[13px] text-white hover:border-amber-400/40"
            >
              {names[id] ?? id}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-[13px] text-white/80">
            Vote for <span className="font-semibold">{target ? names[target] : ''}</span> to win?
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="w-full rounded-xl bg-amber-600/40 py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
          >
            {busy ? 'Submitting…' : 'Confirm jury vote'}
          </button>
          <button type="button" onClick={() => setStep('pick')} className="w-full text-[12px] text-white/40">
            Back
          </button>
        </div>
      )}
      {err ? <p className="mt-2 text-[12px] text-rose-300">{err}</p> : null}
      {done ? <p className="mt-2 text-[13px] text-emerald-300">Jury vote recorded. ✓</p> : null}
    </div>
  )
}
