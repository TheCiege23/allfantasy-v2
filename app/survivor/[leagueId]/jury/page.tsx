'use client'

import { useParams } from 'next/navigation'

export default function SurvivorJuryPage() {
  const params = useParams()
  const leagueId = typeof params?.leagueId === 'string' ? params.leagueId : ''

  return (
    <div className="min-h-screen bg-[#040915] text-slate-100 px-4 py-8">
      <h1 className="text-xl font-semibold mb-2">Jury & Finale</h1>
      <p className="text-sm text-slate-400 max-w-xl">
        League <span className="text-sky-300">{leagueId.slice(0, 10)}…</span> — jury voting and winner reveal use{' '}
        <code className="text-sky-300">/api/survivor/jury</code>.
      </p>
    </div>
  )
}
