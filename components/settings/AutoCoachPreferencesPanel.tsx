/**
 * AutoCoach Preferences Settings Panel
 * User-facing UI for managing AutoCoach behavior preferences
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAutoCoachPreferences } from '@/lib/autocoach/useAutoCoachPreferences'
import { AutoCoachPositionOverridesPanel } from './AutoCoachPositionOverridesPanel'
import type { AutoCoachUserPreferences } from '@/lib/autocoach/autoCoachPreferences'

const LABEL = 'text-[11px] font-bold uppercase tracking-wider text-white/50'
const CARD = 'rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-4'

export function AutoCoachPreferencesPanel() {
  const {
    preferences,
    loading,
    error,
    fetchPreferences,
    updatePreferences,
    resetPreferences,
    setPositionOverride,
    excludePlayer,
  } = useAutoCoachPreferences()

  const [localPrefs, setLocalPrefs] = useState<AutoCoachUserPreferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [newExcludedPlayerId, setNewExcludedPlayerId] = useState('')

  useEffect(() => {
    void fetchPreferences()
  }, [fetchPreferences])

  useEffect(() => {
    if (preferences) setLocalPrefs(preferences)
  }, [preferences])

  const handleAggressivenessChange = useCallback(
    async (newLevel: 'conservative' | 'balanced' | 'upside') => {
      setSaving(true)
      setSuccess(null)
      try {
        await updatePreferences({ aggressiveness: newLevel })
        setSuccess('Aggressiveness updated')
        setTimeout(() => setSuccess(null), 2000)
      } catch (e) {
        console.error('Failed to update aggressiveness:', e)
      } finally {
        setSaving(false)
      }
    },
    [updatePreferences]
  )

  const handleConfidenceThresholdChange = useCallback(
    async (newThreshold: number) => {
      setSaving(true)
      setSuccess(null)
      try {
        await updatePreferences({ confidenceThreshold: newThreshold })
        setSuccess('Confidence threshold updated')
        setTimeout(() => setSuccess(null), 2000)
      } catch (e) {
        console.error('Failed to update threshold:', e)
      } finally {
        setSaving(false)
      }
    },
    [updatePreferences]
  )

  const handleAddExclusion = useCallback(async () => {
    if (!newExcludedPlayerId.trim()) return
    setSaving(true)
    setSuccess(null)
    try {
      await excludePlayer(newExcludedPlayerId, true)
      setNewExcludedPlayerId('')
      setSuccess('Player added to exclusion list')
      setTimeout(() => setSuccess(null), 2000)
    } catch (e) {
      console.error('Failed to exclude player:', e)
    } finally {
      setSaving(false)
    }
  }, [excludePlayer, newExcludedPlayerId])

  const handleRemoveExclusion = useCallback(
    async (playerId: string) => {
      setSaving(true)
      setSuccess(null)
      try {
        await excludePlayer(playerId, false)
        setSuccess('Player removed from exclusion list')
        setTimeout(() => setSuccess(null), 2000)
      } catch (e) {
        console.error('Failed to remove exclusion:', e)
      } finally {
        setSaving(false)
      }
    },
    [excludePlayer]
  )

  const handleReset = useCallback(async () => {
    if (!confirm('Reset all AutoCoach preferences to defaults?')) return
    setSaving(true)
    setSuccess(null)
    try {
      await resetPreferences()
      setSuccess('Preferences reset to defaults')
      setTimeout(() => setSuccess(null), 2000)
    } catch (e) {
      console.error('Failed to reset:', e)
    } finally {
      setSaving(false)
    }
  }, [resetPreferences])

  if (loading) return <div className="text-sm text-white/50">Loading AutoCoach preferences…</div>

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-100">
        Error loading preferences: {error}
      </div>
    )
  }

  if (!localPrefs) return null

  const aggressivenessMap: Record<string, string> = {
    conservative: 'Conservative — only swap high-confidence matches (4+ pt edge)',
    balanced: 'Balanced — swap on 2+ point edge (recommended)',
    upside: 'Upside — swap on any edge ≥ 0.5 points',
  }

  return (
    <div className={CARD}>
      <div>
        <h2 className={LABEL}>⚡ AutoCoach Preferences</h2>
        <p className="mt-0.5 text-xs text-white/40">
          Customize how Chimmy AutoCoach makes lineup swap decisions. Changes save immediately.
        </p>
      </div>

      {success && (
        <div className="rounded-lg border border-green-500/25 bg-green-500/10 p-2.5 text-sm text-green-100">
          ✓ {success}
        </div>
      )}

      {/* Aggressiveness */}
      <div className="space-y-2.5 border-t border-white/[0.06] pt-4">
        <p className={LABEL}>Aggressiveness</p>
        <div className="space-y-1.5">
          {(['conservative', 'balanced', 'upside'] as const).map((level) => (
            <button
              key={level}
              type="button"
              disabled={saving}
              onClick={() => handleAggressivenessChange(level)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm transition ${
                localPrefs.aggressiveness === level
                  ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-100'
                  : 'border border-white/[0.08] bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
              } ${saving ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <div className="font-semibold capitalize">{level}</div>
              <div className="mt-0.5 text-xs opacity-75">{aggressivenessMap[level]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Confidence Threshold Slider */}
      <div className="space-y-2.5 border-t border-white/[0.06] pt-4">
        <p className={LABEL}>Confidence Threshold</p>
        <p className="text-xs text-white/50">
          Only execute swaps when at least {localPrefs.confidenceThreshold}% confident
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={localPrefs.confidenceThreshold}
            disabled={saving}
            onChange={(e) => handleConfidenceThresholdChange(Number(e.target.value))}
            className="flex-1 cursor-pointer"
          />
          <span className="w-12 text-right text-sm font-semibold text-cyan-400">
            {localPrefs.confidenceThreshold}%
          </span>
        </div>
        <p className="text-[11px] text-white/40">
          Lower = more swaps, Higher = only very confident swaps
        </p>
      </div>

      {/* Notifications */}
      <div className="space-y-2.5 border-t border-white/[0.06] pt-4">
        <p className={LABEL}>Notifications</p>
        <label className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5">
          <input
            type="checkbox"
            checked={localPrefs.notifyAutoSwapInApp ?? true}
            disabled={saving}
            onChange={(e) =>
              updatePreferences({ notifyAutoSwapInApp: e.target.checked }).then(() =>
                setSuccess('Notification settings updated')
              )
            }
            className="h-4 w-4 cursor-pointer"
          />
          <span className="flex-1 text-sm text-white/80">In-app notifications before swap</span>
        </label>
        <label className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5">
          <input
            type="checkbox"
            checked={localPrefs.notifyAutoSwapEmail ?? false}
            disabled={saving}
            onChange={(e) =>
              updatePreferences({ notifyAutoSwapEmail: e.target.checked }).then(() =>
                setSuccess('Notification settings updated')
              )
            }
            className="h-4 w-4 cursor-pointer"
          />
          <span className="flex-1 text-sm text-white/80">Email notifications before swap</span>
        </label>
      </div>

      {/* Player Exclusions */}
      <div className="space-y-2.5 border-t border-white/[0.06] pt-4">
        <p className={LABEL}>Never Auto-Swap</p>
        <p className="text-xs text-white/50">Players on this list will never be auto-swapped out</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Player external ID"
            value={newExcludedPlayerId}
            onChange={(e) => setNewExcludedPlayerId(e.target.value)}
            disabled={saving}
            className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-cyan-500/40"
          />
          <button
            type="button"
            onClick={handleAddExclusion}
            disabled={saving || !newExcludedPlayerId.trim()}
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/20 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {(localPrefs.excludedPlayerIds ?? []).length > 0 && (
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/[0.06] bg-black/20 p-2">
            {localPrefs.excludedPlayerIds.map((playerId) => (
              <div
                key={playerId}
                className="flex items-center justify-between rounded-md bg-white/[0.04] px-2 py-1.5 text-sm"
              >
                <span className="font-mono text-white/70">{playerId}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveExclusion(playerId)}
                  disabled={saving}
                  className="text-xs text-red-400/80 hover:text-red-400 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Learn Tendencies */}
      <div className="space-y-2.5 border-t border-white/[0.06] pt-4">
        <label className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5">
          <input
            type="checkbox"
            checked={localPrefs.learnTendencies ?? false}
            disabled={saving}
            onChange={(e) =>
              updatePreferences({ learnTendencies: e.target.checked }).then(() =>
                setSuccess('Learning mode updated')
              )
            }
            className="h-4 w-4 cursor-pointer"
          />
          <div className="flex-1">
            <span className="text-sm font-semibold text-white/90">Learn lineup tendencies</span>
            <p className="text-xs text-white/50">AutoCoach adapts to your typical lineup choices over time</p>
          </div>
        </label>
      </div>

      {/* Reset Button */}
      <div className="border-t border-white/[0.06] pt-4">
        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/[0.06] disabled:opacity-50"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Advanced: Position Overrides */}
      <div className="border-t border-white/[0.06] pt-4">
        <AutoCoachPositionOverridesPanel />
      </div>
    </div>
  )
}
