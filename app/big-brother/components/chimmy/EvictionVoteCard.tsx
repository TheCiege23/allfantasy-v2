'use client'

import { useState } from 'react'
import type { BigBrotherSummary } from '@/components/big-brother/types'

export function EvictionVoteCard({
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
  const nominees = summary.finalNomineeRosterIds
  const [target, setTarget] = useState<string | null>(null)
  const [step, setStep] = useState<'pick' | 'confirm'>('pick')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!cycle?.id || nominees.length < 1) return null

  const submit = async () => {
    if (!target) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/big-brother/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId: cycle.id, targetRosterId: target }),
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

  return (
    <div className="rounded-xl border border-violet-500/35 bg-[#0a1228] p-4" data-testid="bb-eviction-vote-card">
      <h3 className="text-base font-bold text-white">🗳️ Cast your secret vote.</h3>
      <p className="mt-1 text-[12px] text-white/50">No one sees your choice until results post.</p>

      {step === 'pick' ? (
        <div className="mt-3 space-y-2">
          {nominees.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTarget(id)
                setStep('confirm')
              }}
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-left text-[13px] text-white hover:border-violet-400/40"
            >
              {names[id] ?? id}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-[13px] text-white/80">
            Vote to evict <span className="font-semibold text-white">{target ? names[target] : ''}</span>?
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="w-full rounded-xl bg-violet-600/40 py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
          >
            {busy ? 'Locking…' : 'Confirm vote'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('pick')
              setTarget(null)
            }}
            className="w-full text-[12px] text-white/40 hover:text-white/70"
          >
            Back
          </button>
        </div>
      )}

      {err ? <p className="mt-2 text-[12px] text-rose-300">{err}</p> : null}
      {done ? <p className="mt-2 text-[13px] text-emerald-300">Your vote is locked. ✓</p> : null}
    </div>
  )
}
