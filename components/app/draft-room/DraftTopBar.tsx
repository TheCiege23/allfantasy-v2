'use client'

import Link from 'next/link'
import { Clock, User, Hash, Settings, Play, Pause, RotateCcw, Undo2, Sparkles, ArrowLeftRight, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
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

function translateDraftStatus(draftStatus: string, t: (key: string) => string): string {
  const key = `draftRoom.status.${draftStatus}`
  const out = t(key)
  if (out !== key) return out
  return draftStatus.replace(/_/g, ' ')
}

function translateDraftType(draftType: string, t: (key: string) => string): string {
  const norm = draftType.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
  const key = `draftRoom.draftType.${norm}`
  const out = t(key)
  if (out !== key) return out
  return draftType
}

function translateTimerMode(mode: TimerMode, t: (key: string) => string): string {
  const key = `draftRoom.timerMode.${mode}`
  const out = t(key)
  if (out !== key) return out
  return mode.replace(/_/g, ' ')
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
  const { t } = useLanguage()
  const timerDisplay =
    timerStatus === 'none' || (timerRemainingSeconds == null && timerStatus !== 'paused')
      ? '—'
      : timerStatus === 'paused' && timerRemainingSeconds == null
        ? t('draftRoom.topBar.timerPaused')
        : formatTimerRemaining(timerRemainingSeconds ?? 0)

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#070f21]/95 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-white/95 md:text-lg">{leagueName}</h1>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-white/55">
            <span>{sport}</span>
            <span>·</span>
            <span>{translateDraftType(draftType, t)}</span>
            <span>·</span>
            <span className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/75" data-testid="draft-topbar-timer-mode">
              {t('draftRoom.topBar.timerPrefix')} {translateTimerMode(timerMode, t)}
            </span>
            <span className={`rounded border px-1.5 py-0.5 text-[10px] ${autoPickEnabled ? 'border-cyan-400/35 bg-cyan-500/10 text-cyan-200' : 'border-white/20 bg-white/5 text-white/70'}`} data-testid="draft-topbar-auto-pick-status">
              {t('draftRoom.topBar.autoPickPrefix')}{' '}
              {autoPickEnabled ? t('draftRoom.topBar.autoPick.on') : t('draftRoom.topBar.autoPick.off')}
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
              {translateDraftStatus(draftStatus, t)}
            </span>
          </div>
        </div>
        {backHref && (
          <Link
            href={backHref}
            data-testid="draft-back-button"
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-xs text-white/80 hover:bg-white/10 touch-manipulation"
          >
            {t('draftRoom.topBar.back')}
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
                  ? t('draftRoom.topBar.aiManagerCpuFallback')
                  : orphanDrafterMode === 'ai'
                    ? t('draftRoom.topBar.aiManager')
                    : t('draftRoom.topBar.cpuManager')}
              </span>
            ) : (
              <span className="text-[10px] text-cyan-300/80">{t('draftRoom.topBar.onTheClock')}</span>
            )}
          </div>
        )}
        <div className={`flex items-center gap-1.5 rounded-lg border border-white/12 bg-[#0a1228] px-2.5 py-1.5 ${TIMER_COLORS[timerStatus]}`}>
          <Clock className="h-3.5 w-3.5" />
          <span className="text-sm font-medium tabular-nums" data-testid="draft-topbar-timer-value">{timerDisplay}</span>
          {timerStatus === 'paused' && <span className="text-[10px]">{t('draftRoom.topBar.pausedParen')}</span>}
          {timerStatus === 'expired' && <span className="text-[10px]">{t('draftRoom.topBar.expiredParen')}</span>}
        </div>
        {showUseQueue && onUseQueue && (
          <button
            type="button"
            onClick={onUseQueue}
            disabled={useQueueLoading}
            data-testid="draft-use-queue-button"
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-cyan-300/35 bg-cyan-500/12 px-3 py-2.5 text-xs text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50 touch-manipulation"
            aria-label={t('draftRoom.topBar.aria.useQueue')}
          >
            {useQueueLoading ? '…' : t('draftRoom.topBar.useQueue')}
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
            aria-label={t('draftRoom.topBar.aria.trades')}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {t('draftRoom.topBar.trades')}
            {pendingTradesCount > 0 && (
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-medium text-cyan-100">
                {pendingTradesCount}
              </span>
            )}
          </button>
        )}
        {isReconnecting && (
          <span className="text-[10px] text-amber-400">{t('draftRoom.topBar.reconnecting')}</span>
        )}
        {onResync && (
          <button
            type="button"
            onClick={onResync}
            disabled={resyncLoading}
            data-testid="draft-resync-button"
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-xs text-white/75 hover:bg-white/10 disabled:opacity-50 touch-manipulation"
            aria-label={t('draftRoom.topBar.aria.resync')}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${resyncLoading ? 'animate-spin' : ''}`} />
            {t('draftRoom.topBar.resync')}
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
              aria-label={t('draftRoom.topBar.aria.commissioner')}
            >
              <Settings className="h-3.5 w-3.5" />
              {t('draftRoom.topBar.commissioner')}
            </button>
            {draftStatus === 'in_progress' && (
              <>
                <button
                  type="button"
                  onClick={onPause}
                  disabled={commissionerLoading}
                  data-testid="draft-pause-button"
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100 hover:bg-amber-500/20 disabled:opacity-50 touch-manipulation"
                  aria-label={t('draftRoom.topBar.aria.pause')}
                >
                  <Pause className="h-3.5 w-3.5" />
                  {t('draftRoom.topBar.pause')}
                </button>
                <button
                  type="button"
                  onClick={onResume}
                  disabled={commissionerLoading}
                  data-testid="draft-resume-button"
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50 touch-manipulation"
                  aria-label={t('draftRoom.topBar.aria.resume')}
                >
                  <Play className="h-3.5 w-3.5" />
                  {t('draftRoom.topBar.resume')}
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
                aria-label={t('draftRoom.topBar.aria.resume')}
              >
                <Play className="h-3.5 w-3.5" />
                {t('draftRoom.topBar.resume')}
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
                    aria-label={t('draftRoom.topBar.aria.runAiPick')}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {runAiPickLoading ? t('draftRoom.topBar.running') : t('draftRoom.topBar.runAiPick')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onResetTimer}
                  disabled={commissionerLoading}
                  data-testid="draft-reset-timer-button"
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-xs text-white/75 hover:bg-white/10 disabled:opacity-50 touch-manipulation"
                  aria-label={t('draftRoom.topBar.aria.resetTimer')}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t('draftRoom.topBar.resetTimer')}
                </button>
                <button
                  type="button"
                  onClick={onUndoPick}
                  disabled={commissionerLoading}
                  data-testid="draft-undo-pick-button"
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2.5 text-xs text-red-100 hover:bg-red-500/20 disabled:opacity-50 touch-manipulation"
                  aria-label={t('draftRoom.topBar.aria.undo')}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  {t('draftRoom.topBar.undo')}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </header>
  )
}
