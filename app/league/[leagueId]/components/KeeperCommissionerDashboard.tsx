'use client'

import { useEffect, useState } from 'react'

export function KeeperCommissionerDashboard({ leagueId }: { leagueId: string }) {
  const [session, setSession] = useState<{
    id: string
    teamsSubmitted: number
    totalTeams: number
    deadline: string
    status: string
  } | null>(null)

  useEffect(() => {
    let c = false
    fetch(`/api/keeper/session?leagueId=${encodeURIComponent(leagueId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!c && j?.session) setSession(j.session)
      })
      .catch(() => {})
    return () => {
      c = true
    }
  }, [leagueId])

  if (!session) {
    return (
      <div className="px-6 py-6 text-[13px] text-white/45">
        No active keeper selection session. Open a phase via POST /api/keeper/session (commissioner).
      </div>
    )
  }

  return (
    <div className="space-y-4 px-6 py-6 text-[13px] text-white/85">
      <p className="font-medium text-white">Keeper selection progress</p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full bg-sky-500/70 transition-all"
          style={{ width: `${(session.teamsSubmitted / Math.max(session.totalTeams, 1)) * 100}%` }}
        />
      </div>
      <p className="text-white/55">
        {session.teamsSubmitted} of {session.totalTeams} teams submitted · deadline{' '}
        {new Date(session.deadline).toLocaleString()}
      </p>
      <p className="text-[11px] text-white/40">Use Lock action from POST /api/keeper/session when ready.</p>
    </div>
  )
}
