'use client'

import { useEffect, useState } from 'react'
import type { BigBrotherSummary } from '@/components/big-brother/types'

export function ReplacementNomineeCard({
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
  const [pool, setPool] = useState<string[]>([])
  const [pick, setPick] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!cycle?.id) return
    void (async () => {
      const participants = new Set((cycle.vetoParticipantRosterIds as string[] | null) ?? [])
      const all = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/big-brother/finalists`, {
        cache: 'no-store',
      }).then((r) => r.json())
      const ids = (all.finalistRosterIds as string[] | undefined) ?? []
      setPool(ids.filter((id) => !participants.has(id) && id !== cycle.hohRosterId))
    })()
  }, [cycle, leagueId])

  if (!cycle?.id) return null

  const submit = async () => {
    if (!pick) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/big-brother/replacement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replacementRosterId: pick }),
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
    <div className="rounded-xl border border-amber-500/35 bg-[#0a1228] p-4" data-testid="bb-replacement-card">
      <h3 className="text-sm font-bold text-white">A nominee was removed. Choose a replacement.</h3>
      <p className="mt-1 text-[12px] text-white/50">Veto participants cannot be picked.</p>
      <select
        className="mt-3 w-full rounded-lg border border-white/10 bg-[#040915] px-3 py-2 text-[13px] text-white"
        value={pick ?? ''}
        onChange={(e) => setPick(e.target.value || null)}
      >
        <option value="">Select manager…</option>
        {pool.map((id) => (
          <option key={id} value={id}>
            {names[id] ?? id.slice(0, 8)}
          </option>
        ))}
      </select>
      {err ? <p className="mt-2 text-[12px] text-rose-300">{err}</p> : null}
      <button
        type="button"
        disabled={!pick || busy}
        onClick={() => void submit()}
        className="mt-3 w-full rounded-xl bg-amber-600/35 py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
      >
        {busy ? '…' : 'Confirm Replacement'}
      </button>
    </div>
  )
}
