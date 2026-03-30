'use client'

import { useEffect, useState } from 'react'
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Undo2,
  SkipForward,
  Clock,
  Settings,
  Megaphone,
  RefreshCw,
  CheckSquare,
  Upload,
  Shield,
} from 'lucide-react'
import type { DraftUISettings, TimerMode } from '@/lib/draft-defaults/DraftUISettingsResolver'
import { DraftImportFlow } from './DraftImportFlow'

const TIMER_MODE_OPTIONS: Array<{ value: TimerMode; label: string }> = [
  { value: 'per_pick', label: 'Per pick' },
  { value: 'soft_pause', label: 'Soft pause' },
  { value: 'overnight_pause', label: 'Overnight pause' },
  { value: 'none', label: 'No timer' },
]

export type CommissionerControlCenterModalProps = {
  leagueId: string
  draftStatus: string
  draftType?: string
  draftUISettings: DraftUISettings | null
  skipPickAllowed?: boolean
  orphanStatus?: {
    orphanRosterIds: string[]
    recentActions: Array<{ action: string; createdAt: string; reason: string | null; rosterId?: string }>
  } | null
  isOrphanOnClock?: boolean
  orphanDrafterMode?: 'cpu' | 'ai'
  orphanDrafterEffectiveMode?: 'cpu' | 'ai'
  orphanAiProviderAvailable?: boolean
  timerSeconds: number | null
  rounds?: number
  devyConfig?: { enabled: boolean; devyRounds: number[] } | null
  c2cConfig?: { enabled: boolean; collegeRounds: number[] } | null
  onClose: () => void
  onAction: (action: string, payload?: Record<string, unknown>) => Promise<{ session?: unknown } | void>
  onSettingsPatch: (patch: Partial<DraftUISettings>) => Promise<void>
  onSaveDevyConfig?: (input: { enabled: boolean; devyRounds: number[] }) => Promise<{ ok?: boolean; error?: string; session?: unknown } | void>
  onSaveC2CConfig?: (input: { enabled: boolean; collegeRounds: number[] }) => Promise<{ ok?: boolean; error?: string; session?: unknown } | void>
  onStartDraft?: () => Promise<{ session?: unknown } | void>
  onRunAiPick?: () => Promise<unknown> | void
  runAiPickLoading?: boolean
  onBroadcast?: () => void
  onResync: () => void
  loading?: boolean
}

export function CommissionerControlCenterModal({
  leagueId,
  draftStatus,
  draftType,
  draftUISettings,
  skipPickAllowed = false,
  orphanStatus = null,
  isOrphanOnClock = false,
  orphanDrafterMode = 'cpu',
  orphanDrafterEffectiveMode = orphanDrafterMode,
  orphanAiProviderAvailable = true,
  timerSeconds,
  rounds = 15,
  devyConfig = null,
  c2cConfig = null,
  onClose,
  onAction,
  onSettingsPatch,
  onSaveDevyConfig,
  onSaveC2CConfig,
  onStartDraft,
  onRunAiPick,
  runAiPickLoading = false,
  onBroadcast,
  onResync,
  loading = false,
}: CommissionerControlCenterModalProps) {
  const [timerInput, setTimerInput] = useState(String(timerSeconds ?? 90))
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [showImportFlow, setShowImportFlow] = useState(false)
  const [devyEnabledInput, setDevyEnabledInput] = useState(Boolean(devyConfig?.enabled))
  const [devyRoundsInput, setDevyRoundsInput] = useState((devyConfig?.devyRounds ?? []).join(', '))
  const [devySaving, setDevySaving] = useState(false)
  const [devyMessage, setDevyMessage] = useState<string | null>(null)
  const [c2cEnabledInput, setC2CEnabledInput] = useState(Boolean(c2cConfig?.enabled))
  const [c2cRoundsInput, setC2CRoundsInput] = useState((c2cConfig?.collegeRounds ?? []).join(', '))
  const [c2cSaving, setC2CSaving] = useState(false)
  const [c2cMessage, setC2CMessage] = useState<string | null>(null)

  const ui = draftUISettings ?? ({} as Partial<DraftUISettings>)
  const isPreDraft = draftStatus === 'pre_draft'
  const isInProgress = draftStatus === 'in_progress'
  const isPaused = draftStatus === 'paused'
  const isAuctionDraft = String(draftType ?? '').toLowerCase() === 'auction'
  const pauseControlsEnabled = ui.commissionerPauseControlsEnabled ?? true
  const requestedOrphanMode = ui.orphanDrafterMode ?? orphanDrafterMode ?? 'cpu'
  const effectiveOrphanMode =
    requestedOrphanMode === (orphanDrafterMode ?? 'cpu')
      ? (orphanDrafterEffectiveMode ?? (requestedOrphanMode === 'ai' && !orphanAiProviderAvailable ? 'cpu' : requestedOrphanMode))
      : (requestedOrphanMode === 'ai' && !orphanAiProviderAvailable ? 'cpu' : requestedOrphanMode)
  const orphanModeFallbackActive = requestedOrphanMode === 'ai' && effectiveOrphanMode === 'cpu'
  const runOrphanPickLabel = requestedOrphanMode === 'ai'
    ? orphanModeFallbackActive
      ? 'Run AI pick now (CPU fallback)'
      : 'Run AI pick now'
    : 'Run CPU pick now'

  useEffect(() => {
    setDevyEnabledInput(Boolean(devyConfig?.enabled))
    setDevyRoundsInput((devyConfig?.devyRounds ?? []).join(', '))
  }, [devyConfig?.enabled, devyConfig?.devyRounds])

  useEffect(() => {
    setC2CEnabledInput(Boolean(c2cConfig?.enabled))
    setC2CRoundsInput((c2cConfig?.collegeRounds ?? []).join(', '))
  }, [c2cConfig?.enabled, c2cConfig?.collegeRounds])

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setActionLoading(key)
    try {
      await fn()
    } finally {
      setActionLoading(null)
    }
  }

  const handleSetTimer = () => {
    const sec = Math.max(0, Math.min(86400, parseInt(timerInput, 10) || 90))
    setTimerInput(String(sec))
    run('set_timer', () => onAction('set_timer_seconds', { seconds: sec, resetCurrentTimer: true }))
  }

  const handleToggle = async (key: keyof DraftUISettings, value: boolean) => {
    setSettingsSaving(true)
    try {
      await onSettingsPatch({ [key]: value })
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleTimerModeChange = async (value: TimerMode) => {
    setSettingsSaving(true)
    try {
      await onSettingsPatch({ timerMode: value })
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleOrphanModeChange = async (value: 'cpu' | 'ai') => {
    setSettingsSaving(true)
    try {
      await onSettingsPatch({ orphanDrafterMode: value })
    } finally {
      setSettingsSaving(false)
    }
  }

  const parseDevyRounds = (value: string): number[] => {
    return parseRoundInput(value, rounds)
  }

  const parseC2CRounds = (value: string): number[] => {
    return parseRoundInput(value, rounds)
  }

  const parseRoundInput = (value: string, maxRounds: number): number[] => {
    const tokens = value
      .split(/[,\s]+/)
      .map((token) => token.trim())
      .filter(Boolean)
    const parsed = tokens
      .map((token) => Number.parseInt(token, 10))
      .filter((round) => Number.isFinite(round) && round >= 1 && round <= maxRounds)
    return Array.from(new Set(parsed)).sort((a, b) => a - b)
  }

  const handleSaveDevyConfig = async () => {
    if (!onSaveDevyConfig) return
    setDevySaving(true)
    setDevyMessage(null)
    try {
      const nextRounds = parseDevyRounds(devyRoundsInput)
      const result = await onSaveDevyConfig({ enabled: devyEnabledInput, devyRounds: nextRounds })
      if (result && typeof result === 'object' && typeof (result as { error?: string }).error === 'string') {
        setDevyMessage((result as { error?: string }).error ?? 'Failed to save devy config.')
        return
      }
      setDevyRoundsInput(nextRounds.join(', '))
      setDevyMessage(`Devy config saved (${nextRounds.length} round${nextRounds.length === 1 ? '' : 's'}).`)
    } catch {
      setDevyMessage('Failed to save devy config.')
    } finally {
      setDevySaving(false)
    }
  }

  const handleSaveC2CConfig = async () => {
    if (!onSaveC2CConfig) return
    setC2CSaving(true)
    setC2CMessage(null)
    try {
      const nextRounds = parseC2CRounds(c2cRoundsInput)
      const result = await onSaveC2CConfig({ enabled: c2cEnabledInput, collegeRounds: nextRounds })
      if (result && typeof result === 'object' && typeof (result as { error?: string }).error === 'string') {
        setC2CMessage((result as { error?: string }).error ?? 'Failed to save C2C config.')
        return
      }
      setC2CRoundsInput(nextRounds.join(', '))
      setC2CMessage(`C2C config saved (${nextRounds.length} college round${nextRounds.length === 1 ? '' : 's'}).`)
    } catch {
      setC2CMessage('Failed to save C2C config.')
    } finally {
      setC2CSaving(false)
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-white/12 bg-[#070f21] shadow-2xl max-h-[90vh] overflow-hidden" data-testid="draft-commissioner-modal">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-cyan-400" />
          <h2 className="text-base font-semibold text-white">Commissioner control center</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          data-testid="draft-commissioner-close"
          className="rounded p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Draft flow */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Draft flow</h3>
          <div className="flex flex-wrap gap-2">
            {isPreDraft && onStartDraft && (
              <button
                type="button"
                onClick={() => run('start', onStartDraft)}
                disabled={loading || actionLoading !== null}
                data-testid="draft-commissioner-start"
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Start draft
              </button>
            )}
            {isInProgress && (
              <button
                type="button"
                onClick={() => run('pause', () => onAction('pause'))}
                disabled={loading || actionLoading !== null || !pauseControlsEnabled}
                data-testid="draft-commissioner-pause"
                className="inline-flex items-center gap-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                title={pauseControlsEnabled ? 'Pause draft' : 'Pause controls are disabled in automation settings'}
              >
                <Pause className="h-4 w-4" />
                Pause
              </button>
            )}
            {isPaused && (
              <button
                type="button"
                onClick={() => run('resume', () => onAction('resume'))}
                disabled={loading || actionLoading !== null || !pauseControlsEnabled}
                data-testid="draft-commissioner-resume"
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
                title={pauseControlsEnabled ? 'Resume draft' : 'Pause controls are disabled in automation settings'}
              >
                <Play className="h-4 w-4" />
                Resume
              </button>
            )}
            {(isInProgress || isPaused) && (
              <>
                <button
                  type="button"
                  onClick={() => run('reset_timer', () => onAction('reset_timer'))}
                  disabled={loading || actionLoading !== null || !pauseControlsEnabled}
                  data-testid="draft-commissioner-reset-timer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-white/85 hover:bg-white/10 disabled:opacity-50"
                  title={pauseControlsEnabled ? 'Reset timer' : 'Pause controls are disabled in automation settings'}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset timer
                </button>
                <button
                  type="button"
                  onClick={() => run('undo_pick', () => onAction('undo_pick'))}
                  disabled={loading || actionLoading !== null}
                  data-testid="draft-commissioner-undo"
                  className="inline-flex items-center gap-2 rounded-lg border border-red-400/35 bg-red-500/10 px-3 py-2 text-sm text-red-100 hover:bg-red-500/20 disabled:opacity-50"
                >
                  <Undo2 className="h-4 w-4" />
                  Undo last pick
                </button>
                <button
                  type="button"
                  onClick={() => run('skip_pick', () => onAction('skip_pick'))}
                  disabled={loading || actionLoading !== null || !skipPickAllowed}
                  data-testid="draft-commissioner-skip"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50"
                  title={
                    skipPickAllowed
                      ? 'Advance draft without a player (skipped pick)'
                      : 'Skip pick requires league auto-pick behavior set to skip'
                  }
                >
                  <SkipForward className="h-4 w-4" />
                  Skip pick
                </button>
                <button
                  type="button"
                  onClick={() => run('force_autopick', () => onAction('force_autopick'))}
                  disabled={loading || actionLoading !== null || !(ui.commissionerForceAutoPickEnabled ?? false)}
                  data-testid="draft-commissioner-force-autopick-now"
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-500/12 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
                  title={
                    ui.commissionerForceAutoPickEnabled
                      ? 'Force deterministic auto-pick for the current on-clock roster'
                      : 'Enable "Commissioner force auto-pick" in Draft settings first'
                  }
                >
                  <Play className="h-4 w-4" />
                  Force auto-pick now
                </button>
                {isAuctionDraft && (
                  <>
                    <button
                      type="button"
                      onClick={() => run('resolve_auction', () => onAction('resolve_auction'))}
                      disabled={loading || actionLoading !== null}
                      data-testid="draft-commissioner-resolve-auction"
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      <CheckSquare className="h-4 w-4" />
                      Resolve auction now
                    </button>
                    <button
                      type="button"
                      onClick={() => run('auction_tick', () => onAction('auction_tick'))}
                      disabled={loading || actionLoading !== null}
                      data-testid="draft-commissioner-auction-tick"
                      className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-500/12 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Run auction automation
                    </button>
                  </>
                )}
                {!isAuctionDraft && (
                  <>
                    <button
                      type="button"
                      onClick={() => run('slow_tick', () => onAction('slow_tick'))}
                      disabled={loading || actionLoading !== null}
                      data-testid="draft-commissioner-slow-tick"
                      className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-500/12 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Run slow draft automation
                    </button>
                    <button
                      type="button"
                      onClick={() => run('keeper_tick', () => onAction('keeper_tick'))}
                      disabled={loading || actionLoading !== null}
                      data-testid="draft-commissioner-keeper-tick"
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-500/12 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      <Shield className="h-4 w-4" />
                      Run keeper automation
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => run('complete', () => onAction('complete'))}
                  disabled={loading || actionLoading !== null}
                  data-testid="draft-commissioner-complete"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50"
                >
                  <CheckSquare className="h-4 w-4" />
                  Complete draft
                </button>
              </>
            )}
          </div>
          {!pauseControlsEnabled && (
            <p className="mt-2 text-[11px] text-amber-300/90">
              Pause controls are disabled by automation settings. Re-enable them to pause/resume or reset timer.
            </p>
          )}
        </section>

        {/* Edit timer */}
        {(isInProgress || isPaused) && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Edit timer</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Clock className="h-4 w-4 text-white/50" />
              <input
                type="number"
                min={0}
                max={86400}
                value={timerInput}
                onChange={(e) => setTimerInput(e.target.value)}
                className="w-20 rounded border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-white"
              />
              <span className="text-xs text-white/50">seconds</span>
              <button
                type="button"
                onClick={handleSetTimer}
                disabled={loading || actionLoading !== null || !pauseControlsEnabled}
                data-testid="draft-commissioner-set-timer"
                className="rounded border border-cyan-300/30 bg-cyan-500/12 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
                title={pauseControlsEnabled ? 'Set timer' : 'Pause controls are disabled in automation settings'}
              >
                Set timer
              </button>
            </div>
            <p className="mt-2 text-[11px] text-white/45">
              Skip pick is {skipPickAllowed ? 'enabled by league rules.' : 'disabled by league rules.'}
            </p>
          </section>
        )}

        {/* Toggles */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Draft settings</h3>
          <div className="space-y-2 text-sm">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <span className="text-white/90">Orphan team AI manager</span>
              <button
                type="button"
                role="switch"
                aria-checked={ui.orphanTeamAiManagerEnabled ?? false}
                disabled={settingsSaving}
                data-testid="draft-commissioner-toggle-orphan-ai"
                onClick={() => handleToggle('orphanTeamAiManagerEnabled', !(ui.orphanTeamAiManagerEnabled ?? false))}
                className={`rounded border px-3 py-1 text-xs ${ui.orphanTeamAiManagerEnabled ? 'border-cyan-300/35 bg-cyan-500/12 text-cyan-100' : 'border-white/15 bg-black/30 text-white/70'}`}
              >
                {ui.orphanTeamAiManagerEnabled ? 'On' : 'Off'}
              </button>
            </label>
            {ui.orphanTeamAiManagerEnabled && (
              <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                <span className="text-white/90">Orphan manager mode</span>
                <select
                  value={requestedOrphanMode}
                  disabled={settingsSaving}
                  data-testid="draft-commissioner-select-orphan-drafter-mode"
                  onChange={(event) => handleOrphanModeChange((event.target.value === 'ai' ? 'ai' : 'cpu'))}
                  className="rounded border border-white/20 bg-black/30 px-2 py-1 text-xs text-white"
                >
                  <option value="cpu">CPU (deterministic)</option>
                  <option value="ai">AI (deterministic + narrative)</option>
                </select>
              </label>
            )}
            <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/75" data-testid="draft-commissioner-orphan-status">
              <p>
                Orphan rosters detected: <span className="text-white">{orphanStatus?.orphanRosterIds?.length ?? 0}</span>
                {ui.orphanTeamAiManagerEnabled ? ' · Automated manager enabled.' : ' · Automated manager disabled.'}
              </p>
              {ui.orphanTeamAiManagerEnabled && (
                <p className="mt-1 text-white/60">
                  Requested mode: <span className="text-white">{requestedOrphanMode.toUpperCase()}</span>
                  {' · '}Effective mode:{' '}
                  <span className="text-white">{effectiveOrphanMode.toUpperCase()}</span>
                  {requestedOrphanMode === 'ai' ? ` · AI providers ${orphanAiProviderAvailable ? 'available' : 'unavailable'}.` : '.'}
                </p>
              )}
              {orphanModeFallbackActive && (
                <p className="mt-1 text-amber-300" data-testid="draft-commissioner-orphan-mode-fallback-note">
                  AI mode is selected, but providers are unavailable. Picks run via deterministic CPU fallback.
                </p>
              )}
              {orphanStatus?.recentActions?.length ? (
                <p className="mt-1 text-white/55">
                  Last automated action: {orphanStatus.recentActions[0]?.action ?? '—'}
                </p>
              ) : (
                <p className="mt-1 text-white/50">No automated manager actions yet.</p>
              )}
              {isOrphanOnClock && ui.orphanTeamAiManagerEnabled && onRunAiPick && (
                <button
                  type="button"
                  onClick={() => run('run_ai_pick', async () => { await Promise.resolve(onRunAiPick()) })}
                  disabled={loading || actionLoading !== null || runAiPickLoading}
                  data-testid="draft-commissioner-run-ai-pick"
                  className="mt-2 inline-flex items-center gap-2 rounded border border-violet-400/35 bg-violet-500/12 px-2.5 py-1 text-xs text-violet-100 hover:bg-violet-500/20 disabled:opacity-50"
                >
                  {runAiPickLoading ? 'Running…' : runOrphanPickLabel}
                </button>
              )}
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <span className="text-white/90">Traded pick color mode</span>
              <button
                type="button"
                role="switch"
                aria-checked={ui.tradedPickColorModeEnabled ?? true}
                disabled={settingsSaving}
                data-testid="draft-commissioner-toggle-traded-color"
                onClick={() => handleToggle('tradedPickColorModeEnabled', !(ui.tradedPickColorModeEnabled ?? true))}
                className={`rounded border px-3 py-1 text-xs ${ui.tradedPickColorModeEnabled ? 'border-cyan-300/35 bg-cyan-500/12 text-cyan-100' : 'border-white/15 bg-black/30 text-white/70'}`}
              >
                {ui.tradedPickColorModeEnabled ? 'On' : 'Off'}
              </button>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <span className="text-white/90">Traded pick owner name in red</span>
              <button
                type="button"
                role="switch"
                aria-checked={ui.tradedPickOwnerNameRedEnabled ?? true}
                disabled={settingsSaving}
                data-testid="draft-commissioner-toggle-traded-owner-red"
                onClick={() => handleToggle('tradedPickOwnerNameRedEnabled', !(ui.tradedPickOwnerNameRedEnabled ?? true))}
                className={`rounded border px-3 py-1 text-xs ${ui.tradedPickOwnerNameRedEnabled ? 'border-cyan-300/35 bg-cyan-500/12 text-cyan-100' : 'border-white/15 bg-black/30 text-white/70'}`}
              >
                {ui.tradedPickOwnerNameRedEnabled ? 'On' : 'Off'}
              </button>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <span className="text-white/90">AI ADP</span>
              <button
                type="button"
                role="switch"
                aria-checked={ui.aiAdpEnabled ?? true}
                disabled={settingsSaving}
                data-testid="draft-commissioner-toggle-ai-adp"
                onClick={() => handleToggle('aiAdpEnabled', !(ui.aiAdpEnabled ?? true))}
                className={`rounded border px-3 py-1 text-xs ${ui.aiAdpEnabled ? 'border-cyan-300/35 bg-cyan-500/12 text-cyan-100' : 'border-white/15 bg-black/30 text-white/70'}`}
              >
                {ui.aiAdpEnabled ? 'On' : 'Off'}
              </button>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <span className="text-white/90">AI queue reorder</span>
              <button
                type="button"
                role="switch"
                aria-checked={ui.aiQueueReorderEnabled ?? true}
                disabled={settingsSaving}
                data-testid="draft-commissioner-toggle-ai-queue-reorder"
                onClick={() => handleToggle('aiQueueReorderEnabled', !(ui.aiQueueReorderEnabled ?? true))}
                className={`rounded border px-3 py-1 text-xs ${ui.aiQueueReorderEnabled ? 'border-cyan-300/35 bg-cyan-500/12 text-cyan-100' : 'border-white/15 bg-black/30 text-white/70'}`}
              >
                {ui.aiQueueReorderEnabled ? 'On' : 'Off'}
              </button>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <span className="text-white/90">Live draft ↔ league chat sync</span>
              <button
                type="button"
                role="switch"
                aria-checked={ui.liveDraftChatSyncEnabled ?? false}
                disabled={settingsSaving}
                data-testid="draft-commissioner-toggle-chat-sync"
                onClick={() => handleToggle('liveDraftChatSyncEnabled', !(ui.liveDraftChatSyncEnabled ?? false))}
                className={`rounded border px-3 py-1 text-xs ${ui.liveDraftChatSyncEnabled ? 'border-cyan-300/35 bg-cyan-500/12 text-cyan-100' : 'border-white/15 bg-black/30 text-white/70'}`}
              >
                {ui.liveDraftChatSyncEnabled ? 'On' : 'Off'}
              </button>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <span className="text-white/90">Auto-pick enabled</span>
              <button
                type="button"
                role="switch"
                aria-checked={ui.autoPickEnabled ?? false}
                disabled={settingsSaving}
                data-testid="draft-commissioner-toggle-auto-pick-enabled"
                onClick={() => handleToggle('autoPickEnabled', !(ui.autoPickEnabled ?? false))}
                className={`rounded border px-3 py-1 text-xs ${ui.autoPickEnabled ? 'border-cyan-300/35 bg-cyan-500/12 text-cyan-100' : 'border-white/15 bg-black/30 text-white/70'}`}
              >
                {ui.autoPickEnabled ? 'On' : 'Off'}
              </button>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <span className="text-white/90">Timer mode</span>
              <select
                value={ui.timerMode ?? 'per_pick'}
                disabled={settingsSaving}
                data-testid="draft-commissioner-select-timer-mode"
                onChange={(event) => handleTimerModeChange(event.target.value as TimerMode)}
                className="rounded border border-white/20 bg-black/30 px-2 py-1 text-xs text-white"
              >
                {TIMER_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <span className="text-white/90">Commissioner force auto-pick</span>
              <button
                type="button"
                role="switch"
                aria-checked={ui.commissionerForceAutoPickEnabled ?? false}
                disabled={settingsSaving}
                data-testid="draft-commissioner-toggle-force-autopick"
                onClick={() => handleToggle('commissionerForceAutoPickEnabled', !(ui.commissionerForceAutoPickEnabled ?? false))}
                className={`rounded border px-3 py-1 text-xs ${ui.commissionerForceAutoPickEnabled ? 'border-cyan-300/35 bg-cyan-500/12 text-cyan-100' : 'border-white/15 bg-black/30 text-white/70'}`}
              >
                {ui.commissionerForceAutoPickEnabled ? 'On' : 'Off'}
              </button>
            </label>
            {isAuctionDraft && (
              <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                <span className="text-white/90">Auction auto nomination</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={ui.auctionAutoNominationEnabled ?? false}
                  disabled={settingsSaving}
                  data-testid="draft-commissioner-toggle-auction-auto-nomination"
                  onClick={() => handleToggle('auctionAutoNominationEnabled', !(ui.auctionAutoNominationEnabled ?? false))}
                  className={`rounded border px-3 py-1 text-xs ${ui.auctionAutoNominationEnabled ? 'border-cyan-300/35 bg-cyan-500/12 text-cyan-100' : 'border-white/15 bg-black/30 text-white/70'}`}
                >
                  {ui.auctionAutoNominationEnabled ? 'On' : 'Off'}
                </button>
              </label>
            )}
            <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <span className="text-white/90">Draft import enabled</span>
              <button
                type="button"
                role="switch"
                aria-checked={ui.importEnabled ?? true}
                disabled={settingsSaving}
                data-testid="draft-commissioner-toggle-import-enabled"
                onClick={() => handleToggle('importEnabled', !(ui.importEnabled ?? true))}
                className={`rounded border px-3 py-1 text-xs ${(ui.importEnabled ?? true) ? 'border-cyan-300/35 bg-cyan-500/12 text-cyan-100' : 'border-white/15 bg-black/30 text-white/70'}`}
              >
                {(ui.importEnabled ?? true) ? 'On' : 'Off'}
              </button>
            </label>
          </div>
        </section>

        {/* Devy config */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Devy settings</h3>
          <div className="space-y-2 text-sm">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <span className="text-white/90">Enable devy draft rounds</span>
              <button
                type="button"
                role="switch"
                aria-checked={devyEnabledInput}
                disabled={devySaving || !isPreDraft}
                data-testid="draft-commissioner-toggle-devy-enabled"
                onClick={() => setDevyEnabledInput((prev) => !prev)}
                className={`rounded border px-3 py-1 text-xs ${devyEnabledInput ? 'border-violet-300/35 bg-violet-500/12 text-violet-100' : 'border-white/15 bg-black/30 text-white/70'} disabled:opacity-50`}
              >
                {devyEnabledInput ? 'On' : 'Off'}
              </button>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <span className="text-white/90">Devy rounds (comma-separated)</span>
              <input
                type="text"
                value={devyRoundsInput}
                onChange={(event) => setDevyRoundsInput(event.target.value)}
                disabled={devySaving || !isPreDraft}
                data-testid="draft-commissioner-input-devy-rounds"
                placeholder="e.g. 1, 3, 5"
                className="w-36 rounded border border-white/20 bg-black/30 px-2 py-1 text-xs text-white disabled:opacity-60"
              />
            </label>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/60">
              <span>
                {isPreDraft
                  ? `Valid rounds: 1-${rounds}. Duplicate and invalid values are removed automatically.`
                  : 'Devy config is locked after draft start.'}
              </span>
              <button
                type="button"
                onClick={handleSaveDevyConfig}
                disabled={devySaving || !isPreDraft || loading || actionLoading !== null}
                data-testid="draft-commissioner-save-devy-config"
                className="shrink-0 rounded border border-violet-300/35 bg-violet-500/12 px-3 py-1 text-xs text-violet-100 hover:bg-violet-500/20 disabled:opacity-50"
              >
                {devySaving ? 'Saving…' : 'Save'}
              </button>
            </div>
            {devyMessage && (
              <p className="text-[11px] text-white/70" data-testid="draft-commissioner-devy-config-message">
                {devyMessage}
              </p>
            )}
          </div>
        </section>

        {/* C2C config */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">C2C settings</h3>
          <div className="space-y-2 text-sm">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <span className="text-white/90">Enable C2C college/pro rounds</span>
              <button
                type="button"
                role="switch"
                aria-checked={c2cEnabledInput}
                disabled={c2cSaving || !isPreDraft}
                data-testid="draft-commissioner-toggle-c2c-enabled"
                onClick={() => setC2CEnabledInput((prev) => !prev)}
                className={`rounded border px-3 py-1 text-xs ${c2cEnabledInput ? 'border-violet-300/35 bg-violet-500/12 text-violet-100' : 'border-white/15 bg-black/30 text-white/70'} disabled:opacity-50`}
              >
                {c2cEnabledInput ? 'On' : 'Off'}
              </button>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <span className="text-white/90">College rounds (comma-separated)</span>
              <input
                type="text"
                value={c2cRoundsInput}
                onChange={(event) => setC2CRoundsInput(event.target.value)}
                disabled={c2cSaving || !isPreDraft}
                data-testid="draft-commissioner-input-c2c-rounds"
                placeholder="e.g. 1, 3, 5"
                className="w-36 rounded border border-white/20 bg-black/30 px-2 py-1 text-xs text-white disabled:opacity-60"
              />
            </label>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/60">
              <span>
                {isPreDraft
                  ? `Valid rounds: 1-${rounds}. College rounds are C2C-only; all others are pro rounds.`
                  : 'C2C config is locked after draft start.'}
              </span>
              <button
                type="button"
                onClick={handleSaveC2CConfig}
                disabled={c2cSaving || !isPreDraft || loading || actionLoading !== null}
                data-testid="draft-commissioner-save-c2c-config"
                className="shrink-0 rounded border border-violet-300/35 bg-violet-500/12 px-3 py-1 text-xs text-violet-100 hover:bg-violet-500/20 disabled:opacity-50"
              >
                {c2cSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
            {c2cMessage && (
              <p className="text-[11px] text-white/70" data-testid="draft-commissioner-c2c-config-message">
                {c2cMessage}
              </p>
            )}
          </div>
        </section>

        {/* Import draft */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Import</h3>
          {(ui.importEnabled ?? true) ? (!showImportFlow ? (
            <button
              type="button"
              onClick={() => setShowImportFlow(true)}
              data-testid="draft-commissioner-open-import"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
              title="Import draft order, picks, traded picks, keepers"
            >
              <Upload className="h-4 w-4" />
              Import draft data
            </button>
          ) : (
            <DraftImportFlow
              leagueId={leagueId}
              onSuccess={() => {
                setShowImportFlow(false)
                onResync()
              }}
              onClose={() => setShowImportFlow(false)}
            />
          )) : (
            <p className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200" data-testid="draft-commissioner-import-disabled-note">
              Draft import is disabled. Enable it in Draft settings to use validate/commit/rollback flows.
            </p>
          )}
        </section>

        {/* Broadcast & Resync */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Tools</h3>
          <div className="flex flex-wrap gap-2">
            {onBroadcast && (
              <button
                type="button"
                onClick={onBroadcast}
                data-testid="draft-commissioner-open-broadcast"
                className="inline-flex items-center gap-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 hover:bg-amber-500/20"
              >
                <Megaphone className="h-4 w-4" />
                Broadcast to leagues
              </button>
            )}
            <button
              type="button"
              onClick={onResync}
              disabled={loading}
              data-testid="draft-commissioner-resync"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50"
              title="Reload session, settings, queue"
            >
              <RefreshCw className="h-4 w-4" />
              Resync / Reload
            </button>
          </div>
        </section>
      </div>

      {(actionLoading || settingsSaving || devySaving || c2cSaving) && (
        <div className="border-t border-white/8 px-4 py-2 text-xs text-white/50">
          {actionLoading
            ? `Running ${actionLoading}…`
            : settingsSaving
              ? 'Saving settings…'
              : devySaving
                ? 'Saving devy config…'
                : c2cSaving
                  ? 'Saving C2C config…'
                  : ''}
        </div>
      )}
    </div>
  )
}
