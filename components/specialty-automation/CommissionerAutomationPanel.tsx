'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'

export default function CommissionerAutomationPanel({
  leagueId,
  defaultSeason,
  defaultWeek,
  onAfterRun,
}: {
  leagueId: string
  defaultSeason: number
  defaultWeek: number
  onAfterRun?: () => void | Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [season, setSeason] = useState(String(defaultSeason))
  const [week, setWeek] = useState(String(defaultWeek))

  const parseSeason = () => Math.max(2000, Math.min(2100, Number.parseInt(season, 10) || defaultSeason))
  const parseWeek = (): number | null => {
    const w = Number.parseInt(week, 10)
    if (Number.isNaN(w)) return null
    return Math.max(0, Math.min(53, w))
  }

  const run = async (force: boolean, override: boolean) => {
    setLoading(true)
    setMessage(null)
    try {
      const path = override
        ? `/api/leagues/${leagueId}/specialty-automation/override`
        : `/api/leagues/${leagueId}/specialty-automation/run`
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season: parseSeason(),
          week: parseWeek(),
          trigger: 'onManualRun',
          ...(override ? {} : { force }),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(json.error ?? 'Run failed')
        return
      }
      const sum = json.result?.summary ?? json.summary ?? 'Done'
      setMessage(sum)
      await onAfterRun?.()
    } catch {
      setMessage('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-cyan-400/20 bg-cyan-950/20 px-3 py-3">
      <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-cyan-200/90">
        <Sparkles className="h-4 w-4" />
        Commissioner automation
      </div>
      <p className="mb-3 text-[12px] text-white/55">
        Re-run specialty rules for a chosen season and week. Normal runs are idempotent where configured. Override always
        forces a fresh run for audit replay.
      </p>
      <div className="mb-3 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-[11px] text-white/50">
          Season
          <input
            type="number"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="w-24 rounded-lg border border-white/10 bg-[#0a1228] px-2 py-1.5 text-[13px] text-white"
            min={2000}
            max={2100}
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-white/50">
          Week
          <input
            type="number"
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            className="w-20 rounded-lg border border-white/10 bg-[#0a1228] px-2 py-1.5 text-[13px] text-white"
            min={0}
            max={53}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => run(false, false)}
          className="rounded-lg border border-cyan-400/35 bg-[#0a1228] px-3 py-2 text-[13px] font-semibold text-white transition hover:border-cyan-300/60 disabled:opacity-50"
        >
          {loading ? 'Running…' : 'Run automation'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => run(true, false)}
          className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-[13px] font-medium text-white/70 hover:bg-white/[0.04] disabled:opacity-50"
        >
          Force run
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => run(true, true)}
          className="rounded-lg border border-amber-400/25 bg-amber-950/25 px-3 py-2 text-[13px] font-medium text-amber-100/90 hover:border-amber-300/40 disabled:opacity-50"
        >
          Commissioner override
        </button>
      </div>
      {message ? <p className="mt-2 text-[13px] text-white/75">{message}</p> : null}
    </div>
  )
}
