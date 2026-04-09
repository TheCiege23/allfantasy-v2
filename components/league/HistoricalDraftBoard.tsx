'use client'

import { useEffect, useState } from 'react'

interface DraftPick {
  pick: number
  round: number
  managerId: string
  playerId: string
}

interface Manager {
  id: string
  name: string
  avatar: string | null
}

interface HistoricalDraftBoardProps {
  leagueId: string
  season: number
}

export function HistoricalDraftBoard({ leagueId, season }: HistoricalDraftBoardProps) {
  const [data, setData] = useState<{
    managers: Manager[]
    roundsData: DraftPick[][]
    totalPicks: number
    teamCount: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/league/${leagueId}/draft-history?season=${season}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [leagueId, season])

  if (loading) return <div className="text-sm text-white/40">Loading draft...</div>
  if (!data || data.totalPicks === 0) return <div className="text-sm text-white/40">No draft data for {season}.</div>

  const managerMap = new Map(data.managers.map((m) => [m.id, m]))

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-white/70">{season} Draft ({data.totalPicks} picks)</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-white/5">
              <th className="px-2 py-1.5 text-left text-white/40 font-medium">Rd</th>
              {data.managers.map((m) => (
                <th key={m.id} className="px-2 py-1.5 text-center text-white/60 font-medium min-w-[100px]">
                  <div className="flex flex-col items-center gap-0.5">
                    {m.avatar && (
                      <img src={m.avatar} alt="" className="h-5 w-5 rounded-full" />
                    )}
                    <span className="truncate max-w-[90px]">{m.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.roundsData.map((round, rIdx) => (
              <tr key={rIdx} className="border-t border-white/5">
                <td className="px-2 py-1.5 text-white/30 font-bold">{rIdx + 1}</td>
                {data.managers.map((m) => {
                  const pick = round.find((p) => p.managerId === m.id)
                  return (
                    <td key={m.id} className="px-2 py-1.5 text-center">
                      {pick ? (
                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-white/70">
                          {pick.playerId ?? `Pick ${pick.pick}`}
                        </span>
                      ) : (
                        <span className="text-white/15">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
