'use client'

import { useParams } from 'next/navigation'

export default function SurvivorTribalPage() {
  const params = useParams()
  const leagueId = typeof params?.leagueId === 'string' ? params.leagueId : ''

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col items-center justify-center px-4">
      <div className="max-w-lg text-center space-y-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Tribal Council</p>
        <h1 className="text-2xl font-semibold">League {leagueId.slice(0, 8)}…</h1>
        <p className="text-sm text-slate-400">
          Voting and scroll reveal wire to <code className="text-sky-300">/api/survivor/tribal</code>. Message @Chimmy when
          your league uses private ballots.
        </p>
      </div>
    </div>
  )
}
