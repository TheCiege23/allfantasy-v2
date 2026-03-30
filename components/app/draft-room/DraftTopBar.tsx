'use client'

import Link from 'next/link'
import { Clock, User, Hash, Settings, Play, Pause, RotateCcw, Undo2, Sparkles, ArrowLeftRight, RefreshCw } from 'lucide-react'
import { formatTimerRemaining } from '@/lib/live-draft-engine/DraftTimerService'
import type { TimerMode } from '@/lib/draft-defaults/DraftUISettingsResolver'

export type DraftTopBarProps = {
  leagueName: string
  sport: string
  draftType: string
  currentManagerOnClock: string | null
  pickLabel: string | null
  overallPickNumber: number | null
  timerStatus: 'running' | 'paused' | 'expired' | 'none'
  timerRemainingSeconds: number | null
  isCommissioner: boolean
  draftStatus: string
  timerMode?: TimerMode
  autoPickEnabled?: boolean
  onCommissionerOpen?: () => void
  onPause?: () => void
  onResume?: () => void
  onResetTimer?: () => void
  onUndoPick?: () => void
  commissionerLoading?: boolean
  /** For reconnect/refresh state */
  isReconnecting?: boolean
  /** Orphan roster on clock: show CPU/AI Manager badge and allow Run pick */
  isOrphanOnClock?: boolean
  /** When orphan on clock: 'cpu' | 'ai' — label shows "CPU Manager" or "AI Manager" */
  orphanDrafterMode?: 'cpu' | 'ai'
  /** Selected setting mode; used to show fallback state when requested AI runs in CPU fallback. */
  orphanDrafterRequestedMode?: 'cpu' | 'ai'
  /** True when requested AI mode fell back to CPU due unavailable providers/errors. */
  orphanFallbackActive?: boolean
  onRunAiPick?: () => void
  runAiPickLoading?: boolean
  onTradesClick?: () => void
  pendingTradesCount?: number
  /** Slow draft: when timer expired and user on clock, show "Use queue" and call this */
  onUseQueue?: () => void
  useQueueLoading?: boolean
  /** Show "Use queue" (timer expired, user on clock, has queue) */
  showUseQueue?: boolean
  onResync?: () => void
  resyncLoading?: boolean
  backHref?: string
}

const TIMER_COLORS = {
  running: 'text-emerald-400',
  paused: 'text-amber-400',
  expired: 'text-red-400',
  none: 'text-white/60',
}

export function DraftTopBar({
  leagueName,
  sport,
  draftType,
  currentManagerOnClock,
  pickLabel,
  overallPickNumber,
  timerStatus,
  timerRemainingSeconds,
  isCommissioner,
  draftStatus,
  timerMode = 'per_pick',
  autoPickEnabled = false,
  onCommissionerOpen,
  onPause,
  onResume,
  onResetTimer,
  onUndoPick,
  commissionerLoading = false,
  isReconnecting = false,
  isOrphanOnClock = false,
  orphanDrafterMode = 'cpu',
  orphanDrafterRequestedMode = orphanDrafterMode,
  orphanFallbackActive = false,
  onRunAiPick,
  runAiPickLoading = false,
  onTradesClick,
  pendingTradesCount = 0,
  onUseQueue,
  useQueueLoading = false,
  showUseQueue = false,
  onResync,
  resyncLoading = false,
  backHref,
}: DraftTopBarProps) {
  const timerDisplay =
    timerStatus === 'none' || (timerRemainingSeconds == null && timerStatus !== 'paused')
      ? '—'
      : timerStatus === 'paused' && timerRemainingSeconds == null
        ? 'Paused'
        : formatTimerRemaining(timerRemainingSeconds ?? 0)

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#070f21]/95 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-white/95 md:text-lg">{leagueName}</h1>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-white/55">
            <span>{sport}</span>
            <span>·</span>
            <span>{draftType}</span>
            <span>·</span>
            <span className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/75" data-testid="draft-topbar-timer-mode">
              timer: {timerMode.replace('_', ' ')}
            </span>
            <span className={`rounded border px-1.5 py-0.5 text-[10px] ${autoPickEnabled ? 'border-cyan-400/35 bg-cyan-500/10 text-cyan-200' : 'border-white/20 bg-white/5 text-white/70'}`} data-testid="draft-topbar-auto-pick-status">
              auto-pick: {autoPickEnabled ? 'on' : 'off'}
            </span>
            <span>·</span>
            <span
              className={`rounded border px-1.5 py-0.5 text-[10px] ${
                draftStatus === 'in_progress'
                  ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200'
                  : draftStatus === 'paused'
                    ? 'border-amber-400/35 bg-amber-500/10 text-amber-200'
                    : draftStatus === 'completed'
                      ? 'border-cyan-400/35 bg-cyan-500/10 text-cyan-200'
                      : 'border-white/20 bg-white/5 text-white/70'
              }`}
            >
              {draftStatus.replace('_', ' ')}
            </span>
          </div>
        </div>
        {backHref && (
          <Link
            href={backHref}
            data-testid="draft-back-button"
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-xs text-white/80 hover:bg-white/10 touch-manipulation"
          >
            Back
          </Link>
        )}
        {pickLabel && (
          <div className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-[#0a1228] px-2.5 py-1.5">
            <Hash className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-sm font-medium tabular-nums text-white">{pickLabel}</span>
            {overallPickNumber != null && (
              <span className="text-[10px] text-white/50">#{overallPickNumber}</span>
            )}
          </div>
        )}
        {currentManagerOnClock && (
          <div className="flex items-center gap-1.5 rounded-lg border border-cyan-400/25 bg-cyan-500/8 px-2.5 py-1.5">
            <User className="h-3.5 w-3.5 text-cyan-300" />
            <span className="text-sm font-medium text-cyan-100" data-testid="draft-topbar-on-clock-manager">{currentManagerOnClock}</span>
            {isOrphanOnClock ? (
              <span className="text-[10px] text-cyan-300/80" data-testid="draft-topbar-orphan-mode-label">
                {orphanDrafterRequestedMode === 'ai' && orphanFallbackActive
                  ? 'AI Manager (CPU fallback)'
                  : orphanDrafterMode === 'ai'
                    ? 'AI Manager'
                    : 'CPU Manager'}
              </span>
            ) : (
              <span className="text-[10px] text-cyan-300/80">on the clock</span>
            )}
          </div>
        )}
        <div className={`flex items-center gap-1.5 rounded-lg border border-white/12 bg-[#0a1228] px-2.5 py-1.5 ${TIMER_COLORS[timerStatus]}`}>
          <Clock className="h-3.5 w-3.5" />
          <span className="text-sm font-medium tabular-nums" data-testid="draft-topbar-timer-value">{timerDisplay}</span>
          {timerStatus === 'paused' && <span className="text-[10px]">(paused)</span>}
          {timerStatus === 'expired' && <span className="text-[10px]">(expired)</span>}
        </div>
        {showUseQueue && onUseQueue && (
          <button
            type="button"
            onClick={onUseQueue}
            disabled={useQueueLoading}
            data-testid="draft-use-queue-button"
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-cyan-300/35 bg-cyan-500/12 px-3 py-2.5 text-xs text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50 touch-manipulation"
            aria-label="Submit pick from queue"
          >
            {useQueueLoading ? '…' : 'Use queue'}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onTradesClick && (
          <button
            type="button"
            onClick={onTradesClick}
            data-testid="draft-open-trades-button"
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-xs text-white/85 hover:bg-white/10 touch-manipulation"
            aria-label="Draft pick trades"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Trades
            {pendingTradesCount > 0 && (
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-medium text-cyan-100">
                {pendingTradesCount}
              </span>
            )}
          </button>
        )}
        {isReconnecting && (
          <span className="text-[10px] text-amber-400">Reconnecting…</span>
        )}
        {onResync && (
          <button
            type="button"
            onClick={onResync}
            disabled={resyncLoading}
            data-testid="draft-resync-button"
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-xs text-white/75 hover:bg-white/10 disabled:opacity-50 touch-manipulation"
            aria-label="Resync draft room"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${resyncLoading ? 'animate-spin' : ''}`} />
            Resync
          </button>
        )}
        {isCommissioner && (
          <>
            <button
              type="button"
              onClick={onCommissionerOpen}
              data-testid="draft-open-commissioner-controls"
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-xs text-white/85 hover:bg-white/10 disabled:opacity-50 touch-manipulation"
              disabled={commissionerLoading}
              aria-label="Commissioner controls"
            >
              <Settings className="h-3.5 w-3.5" />
              Commissioner
            </button>
            {draftStatus === 'in_progress' && (
              <>
                <button
                  type="button"
                  onClick={onPause}
                  disabled={commissionerLoading}
                  data-testid="draft-pause-button"
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100 hover:bg-amber-500/20 disabled:opacity-50 touch-manipulation"
                  aria-label="Pause draft"
                >
                  <Pause className="h-3.5 w-3.5" />
                  Pause
                </button>
                <button
                  type="button"
                  onClick={onResume}
                  disabled={commissionerLoading}
                  data-testid="draft-resume-button"
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50 touch-manipulation"
                  aria-label="Resume draft"
                >
                  <Play className="h-3.5 w-3.5" />
                  Resume
                </button>
              </>
            )}
            {draftStatus === 'paused' && (
              <button
                type="button"
                onClick={onResume}
                disabled={commissionerLoading}
                data-testid="draft-resume-button"
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50 touch-manipulation"
                aria-label="Resume draft"
              >
                <Play className="h-3.5 w-3.5" />
                Resume
              </button>
            )}
            {(draftStatus === 'in_progress' || draftStatus === 'paused') && (
              <>
                {isOrphanOnClock && onRunAiPick && (
                  <button
                    type="button"
                    onClick={onRunAiPick}
                    disabled={commissionerLoading || runAiPickLoading}
                    data-testid="draft-run-ai-pick-button"
                    className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-violet-400/35 bg-violet-500/10 px-3 py-2.5 text-xs text-violet-100 hover:bg-violet-500/20 disabled:opacity-50 touch-manipulation"
                    aria-label="Run AI pick for orphan"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {runAiPickLoading ? 'Running…' : 'Run AI pick'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onResetTimer}
                  disabled={commissionerLoading}
                  data-testid="draft-reset-timer-button"
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-xs text-white/75 hover:bg-white/10 disabled:opacity-50 touch-manipulation"
                  aria-label="Reset timer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset timer
                </button>
                <button
                  type="button"
                  onClick={onUndoPick}
                  disabled={commissionerLoading}
                  data-testid="draft-undo-pick-button"
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2.5 text-xs text-red-100 hover:bg-red-500/20 disabled:opacity-50 touch-manipulation"
                  aria-label="Undo last pick"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  Undo
                </button>
              </>
            )}
          </>
        )}
      </div>
    </header>
  )
}
