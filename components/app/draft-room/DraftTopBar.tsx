'use client'

import { Clock, User, Hash, Settings, Play, Pause, RotateCcw, Undo2, Sparkles, ArrowLeftRight } from 'lucide-react'
import { formatTimerRemaining } from '@/lib/live-draft-engine/DraftTimerService'

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
  onRunAiPick?: () => void
  runAiPickLoading?: boolean
  onTradesClick?: () => void
  pendingTradesCount?: number
  /** Slow draft: when timer expired and user on clock, show "Use queue" and call this */
  onUseQueue?: () => void
  useQueueLoading?: boolean
  /** Show "Use queue" (timer expired, user on clock, has queue) */
  showUseQueue?: boolean
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
  onCommissionerOpen,
  onPause,
  onResume,
  onResetTimer,
  onUndoPick,
  commissionerLoading = false,
  isReconnecting = false,
  isOrphanOnClock = false,
  orphanDrafterMode = 'cpu',
  onRunAiPick,
  runAiPickLoading = false,
  onTradesClick,
  pendingTradesCount = 0,
  onUseQueue,
  useQueueLoading = false,
  showUseQueue = false,
}: DraftTopBarProps) {
  const timerDisplay =
    timerStatus === 'none' || (timerRemainingSeconds == null && timerStatus !== 'paused')
      ? '—'
      : timerStatus === 'paused' && timerRemainingSeconds == null
        ? 'Paused'
        : formatTimerRemaining(timerRemainingSeconds ?? 0)

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/12 bg-black/30 px-4 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <h1 className="text-base font-semibold text-white md:text-lg">{leagueName}</h1>
          <p className="text-xs text-white/60">
            {sport} · {draftType}
          </p>
        </div>
        {pickLabel && (
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5">
            <Hash className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-sm font-medium tabular-nums text-white">{pickLabel}</span>
            {overallPickNumber != null && (
              <span className="text-[10px] text-white/50">#{overallPickNumber}</span>
            )}
          </div>
        )}
        {currentManagerOnClock && (
          <div className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5">
            <User className="h-3.5 w-3.5 text-cyan-300" />
            <span className="text-sm font-medium text-cyan-100">{currentManagerOnClock}</span>
            {isOrphanOnClock ? (
              <span className="text-[10px] text-cyan-300/80">{orphanDrafterMode === 'ai' ? 'AI Manager' : 'CPU Manager'}</span>
            ) : (
              <span className="text-[10px] text-cyan-300/80">on the clock</span>
            )}
          </div>
        )}
        <div className={`flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 ${TIMER_COLORS[timerStatus]}`}>
          <Clock className="h-3.5 w-3.5" />
          <span className="text-sm font-medium tabular-nums">{timerDisplay}</span>
          {timerStatus === 'paused' && <span className="text-[10px]">(paused)</span>}
          {timerStatus === 'expired' && <span className="text-[10px]">(expired)</span>}
        </div>
        {showUseQueue && onUseQueue && (
          <button
            type="button"
            onClick={onUseQueue}
            disabled={useQueueLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-2.5 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50"
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs text-white/90 hover:bg-white/10"
            aria-label="Draft pick trades"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Trades
            {pendingTradesCount > 0 && (
              <span className="rounded-full bg-cyan-500/40 px-1.5 py-0.5 text-[10px] font-medium text-cyan-200">
                {pendingTradesCount}
              </span>
            )}
          </button>
        )}
        {isReconnecting && (
          <span className="text-[10px] text-amber-400">Reconnecting…</span>
        )}
        {isCommissioner && (
          <>
            <button
              type="button"
              onClick={onCommissionerOpen}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs text-white/90 hover:bg-white/10 disabled:opacity-50"
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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
                  aria-label="Pause draft"
                >
                  <Pause className="h-3.5 w-3.5" />
                  Pause
                </button>
                <button
                  type="button"
                  onClick={onResume}
                  disabled={commissionerLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
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
                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-2.5 py-1.5 text-xs text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
                  aria-label="Reset timer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset timer
                </button>
                <button
                  type="button"
                  onClick={onUndoPick}
                  disabled={commissionerLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-200 hover:bg-red-500/20 disabled:opacity-50"
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
