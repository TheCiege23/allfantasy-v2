'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import type { DraftUISettings } from '@/lib/draft-defaults/DraftUISettingsResolver'
import { DraftImportFlow } from './DraftImportFlow'

export type CommissionerControlCenterModalProps = {
  leagueId: string
  draftStatus: string
  draftUISettings: DraftUISettings | null
  timerSeconds: number | null
  onClose: () => void
  onAction: (action: string, payload?: Record<string, unknown>) => Promise<{ session?: unknown } | void>
  onSettingsPatch: (patch: Partial<DraftUISettings>) => Promise<void>
  onStartDraft?: () => Promise<{ session?: unknown } | void>
  onBroadcast?: () => void
  onResync: () => void
  loading?: boolean
}

export function CommissionerControlCenterModal({
  leagueId,
  draftStatus,
  draftUISettings,
  timerSeconds,
  onClose,
  onAction,
  onSettingsPatch,
  onStartDraft,
  onBroadcast,
  onResync,
  loading = false,
}: CommissionerControlCenterModalProps) {
  const [timerInput, setTimerInput] = useState(String(timerSeconds ?? 90))
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [showImportFlow, setShowImportFlow] = useState(false)

  const ui = draftUISettings ?? ({} as Partial<DraftUISettings>)
  const isPreDraft = draftStatus === 'pre_draft'
  const isInProgress = draftStatus === 'in_progress'
  const isPaused = draftStatus === 'paused'

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setActionLoading(key)
    try {
      await fn()
    } finally {
      setActionLoading(null)
    }
  }

  const handleSetTimer = () => {
    const sec = Math.max(0, Math.min(300, parseInt(timerInput, 10) || 90))
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
                disabled={loading || actionLoading !== null}
                data-testid="draft-commissioner-pause"
                className="inline-flex items-center gap-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
              >
                <Pause className="h-4 w-4" />
                Pause
              </button>
            )}
            {isPaused && (
              <button
                type="button"
                onClick={() => run('resume', () => onAction('resume'))}
                disabled={loading || actionLoading !== null}
                data-testid="draft-commissioner-resume"
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
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
                  disabled={loading || actionLoading !== null}
                  data-testid="draft-commissioner-reset-timer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-white/85 hover:bg-white/10 disabled:opacity-50"
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
                  disabled={loading || actionLoading !== null}
                  data-testid="draft-commissioner-skip"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50"
                  title="Advance draft without a player (skipped pick)"
                >
                  <SkipForward className="h-4 w-4" />
                  Skip pick
                </button>
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
                max={300}
                value={timerInput}
                onChange={(e) => setTimerInput(e.target.value)}
                className="w-20 rounded border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-white"
              />
              <span className="text-xs text-white/50">seconds</span>
              <button
                type="button"
                onClick={handleSetTimer}
                disabled={loading || actionLoading !== null}
                data-testid="draft-commissioner-set-timer"
                className="rounded border border-cyan-300/30 bg-cyan-500/12 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
              >
                Set timer
              </button>
            </div>
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
          </div>
        </section>

        {/* Import draft */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Import</h3>
          {!showImportFlow ? (
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

      {(actionLoading || settingsSaving) && (
        <div className="border-t border-white/8 px-4 py-2 text-xs text-white/50">
          {actionLoading ? `Running ${actionLoading}…` : settingsSaving ? 'Saving settings…' : ''}
        </div>
      )}
    </div>
  )
}
