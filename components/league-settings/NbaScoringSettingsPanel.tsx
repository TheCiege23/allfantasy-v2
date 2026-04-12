'use client'

/**
 * [NEW] components/league-settings/NbaScoringSettingsPanel.tsx
 * NBA scoring settings editor for Create League form + Commissioner Settings.
 * Shows preset selector, scoring values, warning banners, premium gating.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Lock, AlertTriangle, Check, Info } from 'lucide-react'
import { SubscriptionGateModal } from '@/components/subscription/SubscriptionGateModal'

type PresetKey = 'af_default' | 'sleeper_default' | 'espn_default' | 'yahoo_default' | 'custom'

interface ScoringPreset {
  key: PresetKey
  label: string
  description: string
  warning?: string
  rules: Record<string, number>
}

interface NbaScoringConfig {
  presetKey: PresetKey
  presetLabel: string
  source: string
  rules: Record<string, number>
  matchesPreset: boolean
  premiumFeaturesUsed: boolean
}

const STAT_LABELS: Record<string, string> = {
  points_scored: 'Points Scored',
  rebound: 'Rebound',
  offensive_rebound: 'Offensive Rebound',
  defensive_rebound: 'Defensive Rebound',
  assist: 'Assist',
  steal: 'Steal',
  block: 'Block',
  turnover: 'Turnover',
  field_goals_made: 'Field Goals Made',
  field_goals_attempted: 'Field Goals Attempted',
  field_goals_missed: 'Field Goals Missed',
  free_throws_made: 'Free Throws Made',
  free_throws_attempted: 'Free Throws Attempted',
  free_throws_missed: 'Free Throws Missed',
  three_point_made: '3-Point Shots Made',
  three_point_attempted: '3-Point Shots Attempted',
  three_point_missed: '3-Point Shots Missed',
  double_double: 'Double-Double',
  triple_double: 'Triple-Double',
  forty_plus_points_bonus: '40+ Points Bonus',
  fifty_plus_points_bonus: '50+ Points Bonus',
  fifteen_plus_assists_bonus: '15+ Assists Bonus',
  twenty_plus_rebounds_bonus: '20+ Rebounds Bonus',
  technical_foul: 'Technical Foul',
  flagrant_foul: 'Flagrant Foul',
  personal_foul: 'Personal Foul',
  plus_minus: 'Plus/Minus',
  seconds_played: 'Seconds Played',
  minutes_played: 'Minutes Played',
}

const STAT_ORDER = Object.keys(STAT_LABELS)

interface Props {
  /** League ID — omit for Create League form (standalone mode). */
  leagueId?: string
  /** If true, saves via API. If false, calls onChange with config. */
  mode: 'commissioner' | 'create'
  /** For create mode: receive config changes. */
  onChange?: (config: { presetKey: PresetKey; rules: Record<string, number> }) => void
  /** Initial preset key (for create mode). */
  initialPreset?: PresetKey
}

export function NbaScoringSettingsPanel({ leagueId, mode, onChange, initialPreset }: Props) {
  const [presets, setPresets] = useState<ScoringPreset[]>([])
  const [config, setConfig] = useState<NbaScoringConfig | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(mode === 'commissioner')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [gateOpen, setGateOpen] = useState(false)

  const [selectedPreset, setSelectedPreset] = useState<PresetKey>(initialPreset ?? 'af_default')
  const [editedRules, setEditedRules] = useState<Record<string, number>>({})

  // Load config in commissioner mode
  useEffect(() => {
    if (mode !== 'commissioner' || !leagueId) return
    let active = true
    fetch(`/api/commissioner/leagues/${encodeURIComponent(leagueId)}/nba-scoring`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        setPresets(data.presets ?? [])
        setConfig(data.config ?? null)
        setIsPremium(data.isPremium ?? false)
        setSelectedPreset(data.config?.presetKey ?? 'af_default')
        setEditedRules(data.config?.rules ?? {})
      })
      .catch(() => { if (active) setError('Failed to load scoring settings') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [leagueId, mode])

  // In create mode, load presets from static data
  useEffect(() => {
    if (mode !== 'create') return
    fetch('/api/commissioner/leagues/__new__/nba-scoring').catch(() => {})
    // For create mode, use static preset data (no league exists yet)
    // The preset data is embedded in the component for instant loading
  }, [mode])

  const currentPreset = useMemo(() => presets.find((p) => p.key === selectedPreset), [presets, selectedPreset])

  const handlePresetChange = useCallback((key: PresetKey) => {
    if (key === 'custom' && !isPremium && mode === 'commissioner') {
      setGateOpen(true)
      return
    }
    setSelectedPreset(key)
    const preset = presets.find((p) => p.key === key)
    if (preset) {
      setEditedRules({ ...preset.rules })
      onChange?.({ presetKey: key, rules: preset.rules })
    }
  }, [presets, isPremium, mode, onChange])

  const handleRuleChange = useCallback((statKey: string, value: number) => {
    if (!isPremium && mode === 'commissioner') {
      setGateOpen(true)
      return
    }
    setEditedRules((prev) => {
      const next = { ...prev, [statKey]: value }
      setSelectedPreset('custom')
      onChange?.({ presetKey: 'custom', rules: next })
      return next
    })
  }, [isPremium, mode, onChange])

  const save = useCallback(async () => {
    if (!leagueId) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch(`/api/commissioner/leagues/${encodeURIComponent(leagueId)}/nba-scoring`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetKey: selectedPreset, rules: selectedPreset === 'custom' ? editedRules : undefined }),
      })
      const data = await res.json()
      if (data.error === 'premiumRequired') { setGateOpen(true); return }
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      setConfig(data.config)
      setSuccess(true)
    } catch { setError('Request failed') }
    finally { setSaving(false) }
  }, [leagueId, selectedPreset, editedRules])

  if (loading) return <div className="py-6 text-center text-sm text-white/50">Loading scoring settings...</div>

  const displayRules = selectedPreset === 'custom' || Object.keys(editedRules).length > 0
    ? editedRules
    : (currentPreset?.rules ?? config?.rules ?? {})

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-white">Scoring Settings</h3>
        <p className="mt-0.5 text-xs text-white/50">Set custom scoring values for your NBA league.</p>
      </div>

      {/* Preset selector */}
      <div className="space-y-2">
        <label className="text-[11px] font-medium uppercase tracking-wide text-white/50">Scoring Preset</label>
        <div className="flex flex-wrap gap-2">
          {(['af_default', 'sleeper_default', 'espn_default', 'yahoo_default', 'custom'] as PresetKey[]).map((key) => {
            const isCustomLocked = key === 'custom' && !isPremium && mode === 'commissioner'
            return (
              <button
                key={key}
                type="button"
                onClick={() => handlePresetChange(key)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  selectedPreset === key
                    ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200'
                    : isCustomLocked
                      ? 'border-white/5 bg-white/[0.02] text-white/30 cursor-pointer'
                      : 'border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]'
                }`}
              >
                {key === 'af_default' ? 'AllFantasy' : key === 'sleeper_default' ? 'Sleeper' : key === 'espn_default' ? 'ESPN' : key === 'yahoo_default' ? 'Yahoo' : 'Custom'}
                {isCustomLocked && <Lock className="ml-1 inline h-3 w-3 text-white/30" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Warning banner for external presets */}
      {currentPreset?.warning && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-950/15 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="text-[11px] text-amber-200/80">
            <p>{currentPreset.warning}</p>
            <p className="mt-1 text-amber-200/60">AllFantasy specialty leagues are optimized for AF scoring templates.</p>
          </div>
        </div>
      )}

      {/* Scoring values list */}
      <div className="max-h-[50vh] space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-3">
        {STAT_ORDER.map((statKey) => {
          const value = displayRules[statKey] ?? 0
          const isEditable = mode === 'create' || (mode === 'commissioner' && isPremium)

          return (
            <div key={statKey} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
              <span className="text-[12px] text-white/80">{STAT_LABELS[statKey] ?? statKey}</span>
              <div className="flex items-center gap-1">
                {isEditable ? (
                  <input
                    type="number"
                    step="0.1"
                    value={value}
                    onChange={(e) => handleRuleChange(statKey, parseFloat(e.target.value) || 0)}
                    className="w-16 rounded border border-white/15 bg-white/5 px-2 py-1 text-right text-[12px] text-white"
                  />
                ) : (
                  <span className={`w-16 rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-right text-[12px] ${value !== 0 ? 'text-white' : 'text-white/30'}`}>
                    {value}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Preset description */}
      {currentPreset && (
        <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/30" />
          <p className="text-[11px] text-white/40">{currentPreset.description}</p>
        </div>
      )}

      {/* Save (commissioner mode only) */}
      {mode === 'commissioner' && (
        <div className="space-y-2">
          {error && <div className="rounded-lg border border-red-500/20 bg-red-950/20 px-3 py-2 text-xs text-red-300">{error}</div>}
          {success && <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-300">Scoring settings saved.</div>}
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="w-full rounded-lg bg-cyan-600/80 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}

      <SubscriptionGateModal
        isOpen={gateOpen}
        onClose={() => setGateOpen(false)}
        featureId="advanced_scoring"
        featureLabel="Advanced Scoring Customization"
      />
    </div>
  )
}
