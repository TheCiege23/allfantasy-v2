'use client'

import { useEffect, useState } from 'react'

type RecapPayload = {
  recap: string
  sections?: Record<string, unknown>
  deterministicRecap?: string
}

export function DraftRecap({ draftId }: { draftId: string }) {
  const [recap, setRecap] = useState<RecapPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      const res = await fetch(`/api/draft/${encodeURIComponent(draftId)}/recap`, { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!cancelled && res.ok && data) {
        setRecap(data)
      }
      if (!cancelled) {
        setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [draftId])

  if (loading) {
    return <div className="p-6 text-white/60">Loading draft recap...</div>
  }

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-[#081121] p-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">Draft Complete</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Chimmy Post-Draft Recap</h1>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-sm leading-7 text-white/80">
          {recap?.recap ?? recap?.deterministicRecap ?? 'Draft recap unavailable.'}
        </p>
      </div>
      {recap?.sections ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Object.entries(recap.sections).slice(0, 6).map(([key, value]) => (
            <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">{key}</p>
              <p className="mt-2 text-sm text-white/75">
                {typeof value === 'string' ? value : JSON.stringify(value)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
