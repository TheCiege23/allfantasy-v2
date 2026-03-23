'use client'

import { useState, useEffect, useCallback } from 'react'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import type { DivisionView } from '@/lib/promotion-relegation/types'
import type { TeamStandingInDivision } from '@/lib/promotion-relegation/types'

export default function DivisionsTab({ leagueId, isCommissioner = false }: LeagueTabProps) {
  const [divisions, setDivisions] = useState<DivisionView[]>([])
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const [standings, setStandings] = useState<TeamStandingInDivision[]>([])
  const [divisionName, setDivisionName] = useState<string | null>(null)
  const [tierLevel, setTierLevel] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [standingsLoading, setStandingsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<{ transitions: Array<{ teamName: string; type: string; toTierLevel: number }>; applied?: boolean } | null>(null)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  const fetchDivisions = useCallback(async () => {
    if (!leagueId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/divisions`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Failed to load divisions')
      setDivisions(data.divisions ?? [])
      if (!selectedDivisionId && data.divisions?.length) {
        setSelectedDivisionId(data.divisions[0].divisionId)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setDivisions([])
    } finally {
      setLoading(false)
    }
  }, [leagueId, selectedDivisionId])

  useEffect(() => {
    fetchDivisions()
  }, [fetchDivisions])

  useEffect(() => {
    if (!leagueId || !selectedDivisionId) {
      setStandings([])
      return
    }
    setStandingsLoading(true)
    setError(null)
    fetch(
      `/api/leagues/${encodeURIComponent(leagueId)}/divisions/${encodeURIComponent(selectedDivisionId)}/standings`,
      { cache: 'no-store' }
    )
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data?.error ?? 'Failed to load division standings')
        return data
      })
      .then((data) => {
        setStandings(data.standings ?? [])
        setDivisionName(data.divisionName ?? null)
        setTierLevel(data.tierLevel ?? null)
      })
      .catch((e) => {
        setStandings([])
        setError(e instanceof Error ? e.message : 'Failed to load division standings')
      })
      .finally(() => setStandingsLoading(false))
  }, [leagueId, selectedDivisionId])

  const handleRunSeasonEnd = async (dryRun: boolean) => {
    if (!isCommissioner) {
      setRunError('Commissioner only')
      return
    }
    setRunning(true)
    setRunResult(null)
    setRunError(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/promotion/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Run failed')
      setRunResult({
        transitions: (data.transitions ?? []).map((t: { teamName: string; type: string; toTierLevel: number }) => ({
          teamName: t.teamName,
          type: t.type,
          toTierLevel: t.toTierLevel,
        })),
        applied: data.applied,
      })
      if (data.applied) fetchDivisions()
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Run failed')
      setRunResult({
        transitions: [],
        applied: false,
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold text-white">Divisions & Promotion / Relegation</h2>
      {!isCommissioner && (
        <p className="text-xs text-zinc-500">Season-end transition controls are commissioner only.</p>
      )}

      {error && (
        <div className="rounded-xl bg-red-950/30 p-3 text-sm text-red-300">{error}</div>
      )}

      {loading && <p className="text-sm text-zinc-400">Loading divisions…</p>}

      {!loading && divisions.length === 0 && (
        <p className="text-sm text-zinc-500">
          No divisions yet. Create divisions and promotion rules in Commissioner or League settings to use promotion/relegation.
        </p>
      )}

      {!loading && divisions.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {divisions.map((d) => (
              <button
                key={d.divisionId}
                type="button"
                onClick={() => setSelectedDivisionId(d.divisionId)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  selectedDivisionId === d.divisionId
                    ? 'border-amber-500/50 bg-amber-950/50 text-amber-200'
                    : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                {d.name ?? `Tier ${d.tierLevel}`} ({d.teamCount})
              </button>
            ))}
          </div>

          {selectedDivisionId && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-md font-semibold text-white">
                {divisionName ?? 'Division'} {tierLevel != null && `· Tier ${tierLevel}`}
              </h3>
              {standingsLoading && <p className="mt-2 text-sm text-zinc-400">Loading standings…</p>}
              {!standingsLoading && standings.length === 0 && (
                <p className="mt-2 text-sm text-zinc-500">No teams in this division.</p>
              )}
              {!standingsLoading && standings.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-400">
                        <th className="pb-2 pr-2">#</th>
                        <th className="pb-2 pr-2">Team</th>
                        <th className="pb-2 pr-2">Owner</th>
                        <th className="pb-2 pr-2 text-right">W-L-T</th>
                        <th className="pb-2 text-right">PF</th>
                        <th className="pb-2 pl-2 w-24">Zone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s) => (
                        <tr key={s.teamId} className="border-b border-white/5">
                          <td className="py-2 pr-2 font-medium text-white">{s.rank}</td>
                          <td className="py-2 pr-2 text-white">{s.teamName}</td>
                          <td className="py-2 pr-2 text-zinc-400">{s.ownerName}</td>
                          <td className="py-2 pr-2 text-right text-white">
                            {s.wins}-{s.losses}-{s.ties}
                          </td>
                          <td className="py-2 text-right text-white">{s.pointsFor.toFixed(1)}</td>
                          <td className="py-2 pl-2">
                            {s.inPromotionZone && (
                              <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-xs text-green-300">
                                Promotion
                              </span>
                            )}
                            {s.inRelegationZone && (
                              <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-300">
                                Relegation
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-md font-semibold text-white">Season end transition</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Run promotion/relegation to move teams between divisions based on configured rules.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleRunSeasonEnd(true)}
                disabled={running || !isCommissioner}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
              >
                {running ? 'Running…' : 'Dry run'}
              </button>
              <button
                type="button"
                onClick={() => handleRunSeasonEnd(false)}
                disabled={running || !isCommissioner}
                className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
              >
                Run promotion / relegation
              </button>
            </div>
            {runError && (
              <p className="mt-2 text-xs text-red-300">{runError}</p>
            )}
            {runResult && (
              <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
                {runResult.applied ? (
                  <p className="font-medium text-amber-300">Applied {runResult.transitions.length} move(s).</p>
                ) : (
                  <p className="text-zinc-400">
                    {runResult.transitions.length ? 'Planned moves (dry run):' : 'No moves to apply.'}
                  </p>
                )}
                {runResult.transitions.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-zinc-300">
                    {runResult.transitions.map((t, i) => (
                      <li key={i}>
                        {t.teamName} → {t.type} to tier {t.toTierLevel}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
