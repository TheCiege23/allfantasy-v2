'use client'

/**
 * [NEW] components/commissioner/NbaScheduleSettingsPanel.tsx
 * Commissioner controls for NBA schedule behavior — dynamic low-volume days,
 * event day overrides, volume thresholds, and league-type-specific settings.
 */

import { useCallback, useEffect, useState } from 'react'

interface NbaScheduleConfig {
  useDynamicLowVolumeDays: boolean
  eliminationDayOverride: number | null
  ceremonyDayOverride: number | null
  adminDayOverride: number | null
  volumeThresholdHeavy: number
  volumeThresholdModerate: number
  adminOnSecondLeastBusy: boolean
  balancedScoringDayCount: number
  finalWeekCounts: boolean
  transitionDayCount: number
  separateSubtotalDisplay: boolean
}

const DAY_OPTIONS = [
  { value: -1, label: 'Auto (least busy)' },
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export function NbaScheduleSettingsPanel({ leagueId }: { leagueId: string }) {
  const [config, setConfig] = useState<NbaScheduleConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/commissioner/leagues/${encodeURIComponent(leagueId)}/nba-schedule`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => { if (active) setConfig(data.config) })
      .catch(() => { if (active) setError('Failed to load') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [leagueId])

  const save = useCallback(async () => {
    if (!config) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/commissioner/leagues/${encodeURIComponent(leagueId)}/nba-schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Save failed') }
      setSaved(true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }, [leagueId, config])

  if (loading || !config) return <div className="py-4 text-center text-sm text-white/50">Loading...</div>

  const update = (patch: Partial<NbaScheduleConfig>) => setConfig({ ...config, ...patch })

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
      <div>
        <h3 className="text-base font-semibold text-white">NBA Schedule Settings</h3>
        <p className="mt-1 text-xs text-white/50">
          Control how the NBA game calendar maps to your league's fantasy schedule.
        </p>
      </div>

      {/* Dynamic low-volume days */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input type="checkbox" id="dynamic-low-volume" checked={config.useDynamicLowVolumeDays}
            onChange={(e) => update({ useDynamicLowVolumeDays: e.target.checked })}
            className="rounded border-white/20" />
          <label htmlFor="dynamic-low-volume" className="text-sm text-white/80">
            Use dynamic low-volume day detection
          </label>
        </div>
        <p className="text-xs text-white/40">
          Automatically identifies the least/most busy NBA game days each week for event scheduling.
        </p>
      </div>

      {/* Day overrides */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-[11px] text-white/60">Elimination/chop day</label>
          <select value={config.eliminationDayOverride ?? -1}
            onChange={(e) => update({ eliminationDayOverride: Number(e.target.value) === -1 ? null : Number(e.target.value) })}
            className="w-full rounded-lg border border-white/15 bg-[#030a20] px-3 py-2 text-sm text-white">
            {DAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-white/60">Ceremony day</label>
          <select value={config.ceremonyDayOverride ?? -1}
            onChange={(e) => update({ ceremonyDayOverride: Number(e.target.value) === -1 ? null : Number(e.target.value) })}
            className="w-full rounded-lg border border-white/15 bg-[#030a20] px-3 py-2 text-sm text-white">
            {DAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-white/60">Admin processing day</label>
          <select value={config.adminDayOverride ?? -1}
            onChange={(e) => update({ adminDayOverride: Number(e.target.value) === -1 ? null : Number(e.target.value) })}
            className="w-full rounded-lg border border-white/15 bg-[#030a20] px-3 py-2 text-sm text-white">
            {DAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Volume thresholds */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[11px] text-white/60">Heavy day threshold (games)</label>
          <input type="number" min={4} max={15} value={config.volumeThresholdHeavy}
            onChange={(e) => update({ volumeThresholdHeavy: Number(e.target.value) || 9 })}
            className="w-full rounded-lg border border-white/15 bg-[#030a20] px-3 py-2 text-sm text-white" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-white/60">Moderate day threshold (games)</label>
          <input type="number" min={1} max={10} value={config.volumeThresholdModerate}
            onChange={(e) => update({ volumeThresholdModerate: Number(e.target.value) || 5 })}
            className="w-full rounded-lg border border-white/15 bg-[#030a20] px-3 py-2 text-sm text-white" />
        </div>
      </div>

      {/* Scoring options */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-[11px] text-white/60">Balanced scoring day count (Survivor-style, 0 = all)</label>
          <input type="number" min={0} max={7} value={config.balancedScoringDayCount}
            onChange={(e) => update({ balancedScoringDayCount: Number(e.target.value) || 0 })}
            className="w-full rounded-lg border border-white/15 bg-[#030a20] px-3 py-2 text-sm text-white" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="final-week" checked={config.finalWeekCounts}
            onChange={(e) => update({ finalWeekCounts: e.target.checked })}
            className="rounded border-white/20" />
          <label htmlFor="final-week" className="text-sm text-white/80">
            Final NBA regular season week counts for fantasy
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="admin-second" checked={config.adminOnSecondLeastBusy}
            onChange={(e) => update({ adminOnSecondLeastBusy: e.target.checked })}
            className="rounded border-white/20" />
          <label htmlFor="admin-second" className="text-sm text-white/80">
            Use second-least-busy day for admin (reserve least-busy for ceremony)
          </label>
        </div>
      </div>

      {/* Tournament / C2C specific */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[11px] text-white/60">Transition days between rounds (Tournament)</label>
          <input type="number" min={0} max={3} value={config.transitionDayCount}
            onChange={(e) => update({ transitionDayCount: Number(e.target.value) || 0 })}
            className="w-full rounded-lg border border-white/15 bg-[#030a20] px-3 py-2 text-sm text-white" />
        </div>
        <div className="flex items-end">
          <div className="flex items-center gap-2 pb-2">
            <input type="checkbox" id="separate-subtotal" checked={config.separateSubtotalDisplay}
              onChange={(e) => update({ separateSubtotalDisplay: e.target.checked })}
              className="rounded border-white/20" />
            <label htmlFor="separate-subtotal" className="text-sm text-white/80">
              Show separate NBA/NCAAB subtotals (C2C)
            </label>
          </div>
        </div>
      </div>

      {/* Save */}
      {error && <div className="rounded-lg border border-red-500/20 bg-red-950/20 px-3 py-2 text-xs text-red-300">{error}</div>}
      {saved && <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-300">Settings saved</div>}
      <button type="button" disabled={saving} onClick={save}
        className="rounded-lg border border-amber-500/30 bg-amber-600/20 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-600/30 disabled:opacity-50">
        {saving ? 'Saving...' : 'Save schedule settings'}
      </button>
    </div>
  )
}
