'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SurvivorExilePage() {
  const params = useParams()
  const leagueId = typeof params?.leagueId === 'string' ? params.leagueId : ''
  const [summary, setSummary] = useState<unknown>(null)

  useEffect(() => {
    if (!leagueId) return
    fetch(`/api/survivor/exile?leagueId=${encodeURIComponent(leagueId)}`)
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => setSummary({ error: 'Failed to load' }))
  }, [leagueId])

  return (
    <div className="min-h-screen bg-[#040915] text-slate-100 px-4 py-8">
      <h1 className="text-xl font-semibold mb-4">Exile Island</h1>
      <pre className="text-xs text-slate-400 overflow-auto rounded-lg border border-white/10 bg-[#0a1228] p-4">
        {JSON.stringify(summary, null, 2)}
      </pre>
    </div>
  )
}
