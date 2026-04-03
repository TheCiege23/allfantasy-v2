'use client'

import { useEffect, useState } from 'react'

export function KeeperSelectionTab({ leagueId }: { leagueId: string }) {
  const [session, setSession] = useState<{
    deadline: string
    teamsSubmitted: number
    totalTeams: number
    status: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/keeper/session?leagueId=${encodeURIComponent(leagueId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j?.session) {
          setSession({
            deadline: j.session.deadline,
            teamsSubmitted: j.session.teamsSubmitted,
            totalTeams: j.session.totalTeams,
            status: j.session.status,
          })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [leagueId])

  return (
    <div className="space-y-4 px-4 py-4">
      <div>
        <h2 className="text-[15px] font-bold text-white">Keeper selection</h2>
        <p className="text-[11px] text-white/45">
          Submit keepers via API or future inline picker. Eligibility:{' '}
          <span className="text-sky-300/90">/api/keeper/eligibility</span>
        </p>
      </div>
      {session ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[12px] text-amber-100/90">
          <p>
            Status: {session.status} — {session.teamsSubmitted}/{session.totalTeams} submitted
          </p>
          <p className="mt-1 text-white/60">Deadline: {new Date(session.deadline).toLocaleString()}</p>
        </div>
      ) : (
        <p className="text-[12px] text-white/45">No active keeper session.</p>
      )}
    </div>
  )
}
