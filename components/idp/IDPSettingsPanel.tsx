'use client'

/**
 * [NEW] IDP commissioner settings panel. PROMPT 2/6.
 * Position mode, roster preset, scoring preset, draft type, bench/IR.
 * Mobile-first.
 */

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  IDP_POSITION_MODE_LABELS,
  IDP_ROSTER_PRESET_LABELS,
  IDP_SCORING_PRESET_LABELS,
  IDP_DRAFT_TYPE_LABELS,
} from '@/lib/idp'
import { IdpRosterPreview } from '@/components/idp/IdpRosterPreview'

export interface IdpConfigState {
  positionMode: string
  rosterPreset: string
  scoringPreset: string
  bestBallEnabled: boolean
  draftType: string
  benchSlots: number
  irSlots: number
  slotOverrides?: Record<string, number> | null
}

interface Props {
  leagueId: string
  isCommissioner: boolean
  onSaved?: () => void
}

export function IDPSettingsPanel({ leagueId, isCommissioner, onSaved }: Props) {
  const [config, setConfig] = useState<IdpConfigState | null>(null)
  const [rosterPreview, setRosterPreview] = useState<RosterPreviewShape | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function fetchConfig() {
      try {
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/idp/config`, { cache: 'no-store' })
        if (!active) return
        if (!res.ok) {
          setError(res.status === 404 ? 'Not an IDP league' : 'Failed to load')
          setLoading(false)
          return
        }
        const data = await res.json()
        if (data.config) setConfig(data.config)
        if (data.rosterPreview) setRosterPreview(data.rosterPreview)
      } catch {
        if (active) setError('Failed to load')
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchConfig()
    return () => { active = false }
  }, [leagueId])

  const update = (partial: Partial<IdpConfigState>) => {
    if (!config) return
    setConfig({ ...config, ...partial })
  }

  const save = async () => {
    if (!config || !isCommissioner) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/idp/config`, {
        method: 'PATCH',
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

  if (loading) return <div className="text-sm text-white/60">Loading IDP settings…</div>
  if (error && !config) return <div className="text-sm text-red-300">{error}</div>
  if (!config) return null

  const positionModes = ['standard', 'advanced', 'hybrid']
  const rosterPresets = ['beginner', 'standard', 'advanced', 'custom']
  const scoringPresets = ['balanced', 'tackle_heavy', 'big_play_heavy']
  const draftTypes = ['snake', 'linear', 'auction']

  return (
    <div className="space-y-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div>
        <h3 className="text-base font-medium text-white">IDP League Settings</h3>
        <p className="mt-1 text-xs text-white/60">NFL only. Offense + individual defensive players. Changes apply to roster template and scoring.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-1">
        <div className="space-y-2">
          <Label className="text-white/80">Position mode</Label>
          <Select value={config.positionMode} onValueChange={(v) => update({ positionMode: v })}>
            <SelectTrigger className="bg-gray-900 border-white/20 text-white min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {positionModes.map((m) => (
                <SelectItem key={m} value={m}>
                  {IDP_POSITION_MODE_LABELS[m] ?? m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-white/80">Roster preset</Label>
          <Select value={config.rosterPreset} onValueChange={(v) => update({ rosterPreset: v })}>
            <SelectTrigger className="bg-gray-900 border-white/20 text-white min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rosterPresets.map((p) => (
                <SelectItem key={p} value={p}>
                  {IDP_ROSTER_PRESET_LABELS[p] ?? p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-white/80">Scoring preset</Label>
          <Select value={config.scoringPreset} onValueChange={(v) => update({ scoringPreset: v })}>
            <SelectTrigger className="bg-gray-900 border-white/20 text-white min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {scoringPresets.map((p) => (
                <SelectItem key={p} value={p}>
                  {IDP_SCORING_PRESET_LABELS[p] ?? p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-white/80">Draft type</Label>
          <Select value={config.draftType} onValueChange={(v) => update({ draftType: v })}>
            <SelectTrigger className="bg-gray-900 border-white/20 text-white min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {draftTypes.map((d) => (
                <SelectItem key={d} value={d}>
                  {IDP_DRAFT_TYPE_LABELS[d] ?? d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
          <Label className="text-white/80">Best ball</Label>
          <Switch
            checked={config.bestBallEnabled}
            onCheckedChange={(v) => update({ bestBallEnabled: v })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-white/80">Bench slots</Label>
            <Select
              value={String(config.benchSlots)}
              onValueChange={(v) => update({ benchSlots: parseInt(v, 10) })}
            >
              <SelectTrigger className="bg-gray-900 border-white/20 text-white min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[4, 5, 6, 7, 8, 9, 10, 12].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-white/80">IR slots</Label>
            <Select
              value={String(config.irSlots)}
              onValueChange={(v) => update({ irSlots: parseInt(v, 10) })}
            >
              <SelectTrigger className="bg-gray-900 border-white/20 text-white min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {rosterPreview && (
        <IdpRosterPreview
          starterSlots={rosterPreview.starterSlots}
          benchSlots={rosterPreview.benchSlots ?? config.benchSlots}
          irSlots={rosterPreview.irSlots ?? config.irSlots}
          positionMode={config.positionMode}
          rosterPreset={config.rosterPreset}
        />
      )}

      {error && <p className="text-sm text-red-300">{error}</p>}
      {isCommissioner && (
        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
          {saving ? 'Saving…' : 'Save IDP settings'}
        </Button>
      )}
    </div>
  )
}
