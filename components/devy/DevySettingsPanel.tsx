'use client'

/**
 * Devy Dynasty commissioner settings panel. PROMPT 2/6.
 * Mobile-first; saves via PUT /api/leagues/[leagueId]/devy/config.
 */

import { useEffect, useState } from 'react'

interface DevyConfig {
  devySlotCount: number
  taxiSize: number
  rookieDraftRounds: number
  devyDraftRounds: number
  startupVetRounds: number | null
  bestBallEnabled: boolean
  startupDraftType: string
  rookieDraftType: string
  devyDraftType: string
  maxYearlyDevyPromotions: number | null
  earlyDeclareBehavior: string
  rookiePickOrderMethod: string
  devyPickOrderMethod: string
  devyPickTradeRules: string
  rookiePickTradeRules: string
  nflDevyExcludeKDST: boolean
}

interface Props {
  leagueId: string
  isCommissioner: boolean
  onSaved?: () => void
}

export function DevySettingsPanel({ leagueId, isCommissioner, onSaved }: Props) {
  const [config, setConfig] = useState<DevyConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function fetchConfig() {
      try {
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/devy/config`, { cache: 'no-store' })
        if (!active) return
        if (!res.ok) {
          setError(res.status === 404 ? 'Not a devy league' : 'Failed to load')
          setLoading(false)
          return
        }
        const data = await res.json()
        if (data.config) setConfig(data.config)
      } catch {
        if (active) setError('Failed to load')
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchConfig()
    return () => { active = false }
  }, [leagueId])

  const update = (partial: Partial<DevyConfig>) => {
    if (!config) return
    setConfig({ ...config, ...partial })
  }

  const save = async () => {
    if (!config || !isCommissioner) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/devy/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError((err as { error?: string }).error ?? 'Save failed')
        return
      }
      onSaved?.()
    } catch {
      setError('Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-sm text-white/60">Loading devy settings…</div>
  if (error && !config) return <div className="text-sm text-red-300">{error}</div>
  if (!config) return null

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-white">Devy Dynasty settings</h3>
      {!isCommissioner && (
        <p className="text-xs text-white/50">Only the commissioner can edit these.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-white/60">Devy slots</span>
          <input
            type="number"
            min={0}
            max={20}
            value={config.devySlotCount}
            onChange={(e) => update({ devySlotCount: parseInt(e.target.value, 10) || 0 })}
            disabled={!isCommissioner}
            className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white disabled:opacity-50"
          />
        </label>
        <label className="block">
          <span className="text-xs text-white/60">Taxi size</span>
          <input
            type="number"
            min={0}
            max={20}
            value={config.taxiSize}
            onChange={(e) => update({ taxiSize: parseInt(e.target.value, 10) || 0 })}
            disabled={!isCommissioner}
            className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white disabled:opacity-50"
          />
        </label>
        <label className="block">
          <span className="text-xs text-white/60">Rookie draft rounds</span>
          <input
            type="number"
            min={1}
            max={10}
            value={config.rookieDraftRounds}
            onChange={(e) => update({ rookieDraftRounds: parseInt(e.target.value, 10) || 1 })}
            disabled={!isCommissioner}
            className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white disabled:opacity-50"
          />
        </label>
        <label className="block">
          <span className="text-xs text-white/60">Devy draft rounds</span>
          <input
            type="number"
            min={1}
            max={10}
            value={config.devyDraftRounds}
            onChange={(e) => update({ devyDraftRounds: parseInt(e.target.value, 10) || 1 })}
            disabled={!isCommissioner}
            className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white disabled:opacity-50"
          />
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.bestBallEnabled}
          onChange={(e) => update({ bestBallEnabled: e.target.checked })}
          disabled={!isCommissioner}
          className="rounded border-white/20"
        />
        <span className="text-sm text-white/80">Best ball</span>
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs text-white/60">Startup draft type</span>
          <select
            value={config.startupDraftType}
            onChange={(e) => update({ startupDraftType: e.target.value })}
            disabled={!isCommissioner}
            className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white disabled:opacity-50"
          >
            <option value="snake">Snake</option>
            <option value="linear">Linear</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-white/60">Rookie draft type</span>
          <select
            value={config.rookieDraftType}
            onChange={(e) => update({ rookieDraftType: e.target.value })}
            disabled={!isCommissioner}
            className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white disabled:opacity-50"
          >
            <option value="snake">Snake</option>
            <option value="linear">Linear</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-white/60">Devy draft type</span>
          <select
            value={config.devyDraftType}
            onChange={(e) => update({ devyDraftType: e.target.value })}
            disabled={!isCommissioner}
            className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white disabled:opacity-50"
          >
            <option value="snake">Snake</option>
            <option value="linear">Linear</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-xs text-white/60">Rookie pick order</span>
        <select
          value={config.rookiePickOrderMethod}
          onChange={(e) => update({ rookiePickOrderMethod: e.target.value })}
          disabled={!isCommissioner}
          className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white disabled:opacity-50"
        >
          <option value="reverse_standings">Reverse standings</option>
          <option value="lottery">Lottery</option>
          <option value="consolation">Consolation-based</option>
          <option value="custom">Custom (commissioner)</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs text-white/60">Devy pick order</span>
        <select
          value={config.devyPickOrderMethod}
          onChange={(e) => update({ devyPickOrderMethod: e.target.value })}
          disabled={!isCommissioner}
          className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white disabled:opacity-50"
        >
          <option value="reverse_standings">Reverse standings</option>
          <option value="lottery">Lottery</option>
          <option value="consolation">Consolation-based</option>
          <option value="custom">Custom (commissioner)</option>
        </select>
      </label>

      {error && <p className="text-sm text-red-300">{error}</p>}
      {isCommissioner && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      )}
    </div>
  )
}
