'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type SeasonPayload = {
  phase?: string | null
  tribes?: unknown[]
  activeCouncil?: unknown
  currentChallenge?: unknown
  userState?: unknown
}

export default function SurvivorIslandPage() {
  const params = useParams()
  const leagueId = typeof params?.leagueId === 'string' ? params.leagueId : ''
  const [data, setData] = useState<SeasonPayload | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!leagueId) return
    fetch(`/api/survivor/season?leagueId=${encodeURIComponent(leagueId)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setErr('Failed to load Survivor state'))
  }, [leagueId])

  return (
    <div className="min-h-screen bg-[#040915] text-slate-100">
      <header className="border-b border-white/10 px-4 py-3 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight">AllFantasy Survivor</h1>
        <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-xs uppercase text-sky-200">
          {data?.phase ?? '—'}
        </span>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 grid gap-4 md:grid-cols-3">
        <section className="rounded-xl border border-white/10 bg-[#0a1228] p-4 md:col-span-1">
          <h2 className="text-sm font-medium text-slate-300 mb-2">Tribes</h2>
          <p className="text-xs text-slate-500">{Array.isArray(data?.tribes) ? `${data.tribes.length} tribes` : '—'}</p>
        </section>
        <section className="rounded-xl border border-white/10 bg-[#0a1228] p-4 md:col-span-2">
          <h2 className="text-sm font-medium text-slate-300 mb-2">Challenge & Tribal</h2>
          <p className="text-xs text-slate-500">
            {data?.currentChallenge ? 'Challenge active' : 'No open challenge'}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {data?.activeCouncil ? 'Tribal council in progress' : 'No active council'}
          </p>
        </section>
        <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 md:col-span-3">
          <p className="text-xs text-amber-100/90">
            {err ?? 'Use league commissioner tools to initialize Survivor mode; this dashboard reads /api/survivor/season.'}
          </p>
        </section>
      </main>
    </div>
  )
}
