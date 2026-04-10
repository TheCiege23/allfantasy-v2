'use client'

import { useState } from 'react'
import { generatePlayoffs } from '@/lib/redraft/client'

export function StandingsView({
  rows,
  seasonId,
}: {
  rows: { id: string; teamName: string | null; wins: number; losses: number; pointsFor: number }[]
  seasonId: string | null
}) {
  const [playoffTeams, setPlayoffTeams] = useState<number>(Math.min(6, Math.max(2, rows.length || 6)))
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onGenerate = async () => {
    if (!seasonId) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await generatePlayoffs({ seasonId, playoffTeams, regenerate: true })
      const s = res.summary
      if (s) {
        setResult(`Generated ${s.playoffTeams}-team bracket (${s.rounds} rounds, ${s.byes} byes).`)
      } else {
        setResult('Playoff bracket generated.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate playoffs')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
        <p className="text-[11px] text-white/55">Playoffs</p>
        <input
          type="number"
          aria-label="Playoff team count"
          min={2}
          max={Math.max(2, rows.length)}
          value={playoffTeams}
          onChange={(e) => setPlayoffTeams(Math.max(2, Math.min(Number(e.target.value) || 2, Math.max(2, rows.length))))}
          className="w-20 rounded border border-white/15 bg-black/30 px-2 py-1 text-[11px] text-white"
        />
        <button
          type="button"
          onClick={() => void onGenerate()}
          disabled={!seasonId || busy || rows.length < 2}
          className="rounded bg-white/80 px-2 py-1 text-[11px] font-semibold text-black disabled:opacity-50"
        >
          {busy ? 'Generating...' : 'Generate Bracket'}
        </button>
        {result ? <span className="text-[11px] text-emerald-300">{result}</span> : null}
        {error ? <span className="text-[11px] text-rose-300">{error}</span> : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full text-left text-[12px] text-white/80">
        <thead className="border-b border-white/[0.08] bg-white/[0.04] text-[10px] uppercase text-white/45">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Team</th>
            <th className="px-3 py-2">W-L</th>
            <th className="px-3 py-2">PF</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-b border-white/[0.05]">
              <td className="px-3 py-2 text-white/45">{i + 1}</td>
              <td className="px-3 py-2">{r.teamName ?? r.id.slice(0, 6)}</td>
              <td className="px-3 py-2">
                {r.wins}-{r.losses}
              </td>
              <td className="px-3 py-2">{r.pointsFor.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  )
}
