'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowLeftRight,
  Bell,
  Clock,
  Copy,
  Grid2x2,
  Hash,
  LayoutGrid,
  Menu,
  Monitor,
  Moon,
  RefreshCw,
  Settings2,
  Smile,
  Sparkles,
  User,
  Volume2,
} from 'lucide-react'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { formatTimerRemaining } from '@/lib/live-draft-engine/DraftTimerService'
import { useDraftCountdownSeconds } from '@/lib/draft/useDraftCountdown'
import type { TimerMode } from '@/lib/draft-defaults/DraftUISettingsResolver'

export type DraftTopBarProps = {
  leagueName: string
  /** League avatar / logo URL. Rendered next to the name when provided. */
  leagueLogoUrl?: string | null
  sport: string
  draftType: string
  teamCount: number
  rounds: number
  currentManagerOnClock: string | null
  pickLabel: string | null
  overallPickNumber: number | null
  timerStatus: 'running' | 'paused' | 'expired' | 'none'
  timerRemainingSeconds: number | null
  /** When timer is running, anchor countdown to this ISO time (smooth 1s ticks). */
  timerEndAtIso?: string | null
  timerSeconds?: number | null
  isCommissioner: boolean
  draftStatus: string
  timerMode?: TimerMode
  autoPickEnabled?: boolean
  inviteLink?: string | null
  /** Called after copy succeeds (parent handles clipboard). `source` distinguishes inline vs overflow menu. */
  onCopyInvite?: (source: 'inline' | 'menu') => void
  onStartDraft?: () => void
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
  /** When orphan on clock: 'cpu' | 'ai' - label shows "CPU Manager" or "AI Manager" */
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
  /** When set, the settings gear opens league settings on the Draft panel (members + commissioners). */
  leagueDraftSettingsHref?: string | null
  /** Number of browsers currently viewing the draft room (from Supabase presence). */
  onlineCount?: number
}

const TIMER_COLORS = {
  running: 'text-emerald-300 border-emerald-400/25 bg-emerald-500/10',
  paused: 'text-amber-200 border-amber-400/25 bg-amber-500/10',
  expired: 'text-red-200 border-red-400/25 bg-red-500/10',
  none: 'text-white/70 border-white/12 bg-white/5',
}

const PREFS_STORAGE_KEY = 'af:draft-room-topbar-prefs'

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

function formatTimerSummary(timerSeconds: number | null | undefined): string {
  if (!timerSeconds || timerSeconds <= 0) return 'Untimed picks'
  if (timerSeconds < 60) return `${timerSeconds} Seconds Per Pick`
  if (timerSeconds < 3600) {
    const minutes = Math.round(timerSeconds / 60)
    return `${minutes} Minute${minutes === 1 ? '' : 's'} Per Pick`
  }
  if (timerSeconds < 86400) {
    const hours = Math.round(timerSeconds / 3600)
    return `${hours} Hour${hours === 1 ? '' : 's'} Per Pick`
  }
  const days = Math.round(timerSeconds / 86400)
  return `${days} Day${days === 1 ? '' : 's'} Per Pick`
}

function TopIconToggle({
  active,
  icon: Icon,
  label,
  onClick,
  dataTestId,
}: {
  active: boolean
  icon: typeof Bell
  label: string
  onClick: () => void
  dataTestId?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={dataTestId}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 active:scale-[0.96] ${
        active
          ? 'border-[#7d8cff] bg-[#8f9cff]/16 text-[#dbe1ff] shadow-[0_0_16px_rgba(143,156,255,0.2)]'
          : 'border-white/10 bg-[#7180a8]/18 text-white/78 hover:bg-[#7b89af]/26'
      }`}
      aria-pressed={active}
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

export function DraftTopBar({
  leagueName,
  leagueLogoUrl,
  sport,
  draftType,
  teamCount,
  rounds,
  currentManagerOnClock,
  pickLabel,
  overallPickNumber,
  timerStatus,
  timerRemainingSeconds,
  timerEndAtIso = null,
  timerSeconds = null,
  isCommissioner,
  draftStatus,
  timerMode = 'per_pick',
  autoPickEnabled = false,
  inviteLink,
  onCopyInvite,
  onStartDraft,
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
  leagueDraftSettingsHref = null,
  onlineCount,
}: DraftTopBarProps) {
  const { t } = useLanguage()
  const liveRemaining = useDraftCountdownSeconds(timerStatus, timerEndAtIso ?? undefined, timerRemainingSeconds)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState<'idle' | 'copied'>('idle')
  const [prefs, setPrefs] = useState({
    notifications: true,
    sound: true,
    focus: false,
    reactions: true,
    compact: false,
    boardView: true,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(PREFS_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<typeof prefs>
      setPrefs((prev) => ({ ...prev, ...parsed }))
    } catch {
      // Ignore malformed topbar preferences.
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs))
    } catch {
      // Ignore storage failures.
    }
  }, [prefs])

  useEffect(() => {
    if (!menuOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [menuOpen])

  const effectiveRemaining =
    timerStatus === 'running' && timerEndAtIso != null && timerEndAtIso !== ''
      ? liveRemaining
      : timerRemainingSeconds

  const timerDisplay =
    timerStatus === 'none' || (effectiveRemaining == null && timerStatus !== 'paused' && timerStatus !== 'expired')
      ? '-'
      : timerStatus === 'paused' && effectiveRemaining == null
        ? t('draftRoom.topBar.timerPaused')
        : timerStatus === 'expired'
          ? formatTimerRemaining(0)
          : formatTimerRemaining(effectiveRemaining ?? 0)

  const timerSummary = useMemo(() => formatTimerSummary(timerSeconds), [timerSeconds])
  const urgentLowTimer =
    timerStatus === 'running' &&
    timerEndAtIso != null &&
    timerEndAtIso !== '' &&
    liveRemaining != null &&
    liveRemaining <= 15
  const statusLabel = translateDraftStatus(draftStatus, t)
  const draftTypeLabel = translateDraftType(draftType, t)
  const timerModeLabel = translateTimerMode(timerMode, t)

  const centerCta = (() => {
    if (draftStatus === 'pre_draft' && isCommissioner && onStartDraft) {
      return (
        <button
          type="button"
          onClick={onStartDraft}
          disabled={commissionerLoading}
          data-testid="draft-topbar-start-draft"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#aeb7ff]/40 bg-gradient-to-r from-[#9ca9ff] to-[#8b7fd8] px-6 py-3 text-sm font-semibold text-[#0a1030] shadow-[0_12px_36px_rgba(139,127,216,0.35)] transition duration-150 hover:brightness-110 hover:shadow-[0_14px_40px_rgba(156,169,255,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 active:scale-[0.98] disabled:opacity-55"
        >
          <Grid2x2 className="h-4 w-4" />
          START DRAFT
        </button>
      )
    }

    if (draftStatus === 'paused' && isCommissioner && onResume) {
      return (
        <button
          type="button"
          onClick={onResume}
          disabled={commissionerLoading}
          data-testid="draft-topbar-resume-draft"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-emerald-400/40 bg-gradient-to-br from-emerald-500/25 to-emerald-600/15 px-5 py-3 text-sm font-semibold text-emerald-100 shadow-[0_8px_28px_rgba(16,185,129,0.2)] transition duration-150 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50 active:scale-[0.98] disabled:opacity-55"
        >
          <Sparkles className="h-4 w-4" />
          RESUME DRAFT
        </button>
      )
    }

    return (
      <div className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-3 text-sm text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
        <Clock className="h-4 w-4 shrink-0 text-cyan-300/90" />
        <span className="font-medium">{statusLabel}</span>
      </div>
    )
  })()

  const handleCopyInvite = async (source: 'inline' | 'menu') => {
    if (onCopyInvite) {
      onCopyInvite(source)
    } else if (inviteLink && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(inviteLink)
    }
    setCopyFeedback('copied')
    window.setTimeout(() => setCopyFeedback('idle'), 1400)
    setMenuOpen(false)
  }

  const orphanModeLabel =
    orphanDrafterRequestedMode === 'ai' && orphanFallbackActive
      ? t('draftRoom.topBar.aiManagerCpuFallback')
      : orphanDrafterMode === 'ai'
        ? t('draftRoom.topBar.aiManager')
        : t('draftRoom.topBar.cpuManager')

  return (
    <header
      className={`relative border-b border-white/[0.07] bg-gradient-to-b from-[#070d1c]/95 via-[#060b19]/98 to-[#050814] px-3 backdrop-blur-xl sm:px-4 ${prefs.compact ? 'pb-2 pt-2' : 'pb-3 pt-2.5'} ${prefs.focus ? 'shadow-[inset_0_-1px_0_rgba(125,140,255,0.22)]' : ''}`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent"
        aria-hidden
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-start lg:gap-4">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            {backHref ? (
              <Link
                href={backHref}
                data-testid="draft-back-button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-white/78 shadow-sm transition duration-150 hover:bg-white/12 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 active:scale-95"
                aria-label={t('draftRoom.topBar.back')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            ) : null}

            {leagueLogoUrl ? (
              <Image
                src={leagueLogoUrl}
                alt=""
                width={40}
                height={40}
                aria-hidden
                className="h-10 w-10 shrink-0 rounded-xl border border-white/15 bg-gradient-to-br from-white/[0.08] to-white/[0.02] object-cover shadow-[0_4px_20px_rgba(0,0,0,0.35)] ring-1 ring-white/10"
                data-testid="draft-topbar-league-logo"
                unoptimized
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : null}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-bold tracking-tight text-white drop-shadow-sm sm:text-[1.35rem]">
                  {leagueName}
                </h1>
                {onlineCount != null && onlineCount > 0 && (
                  <span
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                    title={`${onlineCount} manager${onlineCount === 1 ? '' : 's'} online`}
                    data-testid="draft-topbar-online-count"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/50 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    {onlineCount}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#97a8d7]">
                <span>{timerSummary}</span>
                <span className="text-white/24">·</span>
                <span>{teamCount} Teams</span>
                <span className="text-white/24">·</span>
                <span>{rounds} Rounds</span>
                <span className="text-white/24">·</span>
                <span className="text-white/55">{sport}</span>
                <span className="text-white/24">·</span>
                <span>{draftTypeLabel}</span>
                <span className="text-white/24">·</span>
                <button
                  type="button"
                  onClick={() => {
                    void handleCopyInvite('inline')
                  }}
                  data-testid="draft-copy-invite-inline"
                  className="inline-flex items-center gap-1 text-[#c6d0ff] transition duration-150 hover:text-white"
                >
                  Invite Leaguemates
                  <Copy className="h-3.5 w-3.5" />
                </button>
                {copyFeedback === 'copied' ? <span className="text-cyan-300">Copied</span> : null}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-2.5">
            {pickLabel ? (
              <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/[0.12] to-[#0a1528]/90 px-3.5 py-2 shadow-[0_4px_24px_rgba(34,211,238,0.12)] ring-1 ring-cyan-400/15">
                <Hash className="h-4 w-4 shrink-0 text-cyan-300" />
                <span className="text-base font-bold tracking-tight text-white sm:text-lg">{pickLabel}</span>
                {overallPickNumber != null ? (
                  <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white/60">
                    #{overallPickNumber}
                  </span>
                ) : null}
              </div>
            ) : null}

            {currentManagerOnClock ? (
              <div className="inline-flex max-w-full items-center gap-2 rounded-xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.14] to-[#0a1228]/95 px-3.5 py-2 shadow-[0_6px_28px_rgba(139,92,246,0.15)] ring-1 ring-violet-400/10">
                <User className="h-4 w-4 shrink-0 text-violet-300" />
                <span
                  className="min-w-0 truncate text-base font-bold text-white sm:text-lg"
                  data-testid="draft-topbar-on-clock-manager"
                >
                  {currentManagerOnClock}
                </span>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-violet-200/75">
                  {isOrphanOnClock ? orphanModeLabel : t('draftRoom.topBar.onTheClock')}
                </span>
              </div>
            ) : null}

            <div
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 py-2 transition-all duration-200 ${TIMER_COLORS[timerStatus]} ${
                urgentLowTimer
                  ? 'relative z-0 scale-105 shadow-[0_0_40px_rgba(251,191,36,0.45)] ring-2 ring-amber-400/60 animate-pulse sm:min-w-[7.5rem] sm:justify-center'
                  : 'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              }`}
              title={`${timerModeLabel} · Auto-pick ${autoPickEnabled ? 'on' : 'off'}`}
            >
              <Clock
                className={`h-4 w-4 shrink-0 ${urgentLowTimer ? 'text-amber-100 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : ''}`}
                aria-hidden
              />
              <span
                className={`font-bold tabular-nums tracking-tight transition-all duration-200 ${
                  urgentLowTimer ? 'text-2xl text-amber-50 sm:text-3xl' : 'text-sm font-semibold'
                }`}
                data-testid="draft-topbar-timer-value"
              >
                {timerDisplay}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-start justify-start lg:justify-center">{centerCta}</div>

        <div className="flex flex-wrap items-start justify-start gap-2 lg:justify-end">
          <div
            className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.14em] transition duration-150 ${
              autoPickEnabled
                ? 'border-emerald-400/40 bg-emerald-500/14 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.12)]'
                : 'border-white/14 bg-white/6 text-white/62'
            }`}
            data-testid="draft-topbar-autopick-pill"
            title="Autopick state"
          >
            <span
              className={`h-2 w-2 rounded-full ${autoPickEnabled ? 'bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-white/35'}`}
              aria-hidden
            />
            Auto-pick {autoPickEnabled ? 'On' : 'Off'}
          </div>

          <TopIconToggle
            active={prefs.notifications}
            icon={Bell}
            label="Draft notifications"
            onClick={() => setPrefs((prev) => ({ ...prev, notifications: !prev.notifications }))}
          />
          <TopIconToggle
            active={prefs.sound}
            icon={Volume2}
            label="Draft sound"
            onClick={() => setPrefs((prev) => ({ ...prev, sound: !prev.sound }))}
          />
          <TopIconToggle
            active={prefs.focus}
            icon={Moon}
            label="Focus mode"
            onClick={() => setPrefs((prev) => ({ ...prev, focus: !prev.focus }))}
          />
          <TopIconToggle
            active={prefs.reactions}
            icon={Smile}
            label="Emoji reactions"
            onClick={() => setPrefs((prev) => ({ ...prev, reactions: !prev.reactions }))}
          />
          <TopIconToggle
            active={prefs.compact}
            icon={Monitor}
            label="Compact chrome"
            onClick={() => setPrefs((prev) => ({ ...prev, compact: !prev.compact }))}
          />
          <TopIconToggle
            active={prefs.boardView}
            icon={LayoutGrid}
            label="Board chrome"
            onClick={() => setPrefs((prev) => ({ ...prev, boardView: !prev.boardView }))}
          />

          {onTradesClick ? (
            <button
              type="button"
              onClick={onTradesClick}
              data-testid="draft-open-trades-button"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/12 bg-[#7180a8]/20 px-3 text-[11px] font-medium text-white/90 shadow-sm transition duration-150 hover:border-cyan-400/30 hover:bg-[#7b89af]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 active:scale-95"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Trades
              {pendingTradesCount > 0 ? (
                <span className="rounded-full border border-cyan-400/35 bg-cyan-500/18 px-1.5 py-0.5 text-[10px] font-bold text-cyan-100">
                  {pendingTradesCount}
                </span>
              ) : null}
            </button>
          ) : null}

          {onResync ? (
            <button
              type="button"
              onClick={onResync}
              disabled={resyncLoading}
              data-testid="draft-resync-button"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/12 bg-[#7180a8]/20 px-3 text-[11px] font-medium text-white/85 transition duration-150 hover:bg-[#7b89af]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 disabled:opacity-55 active:scale-95"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${resyncLoading ? 'animate-spin' : ''}`} />
              Resync
            </button>
          ) : null}

          {leagueDraftSettingsHref ? (
            <Link
              href={leagueDraftSettingsHref}
              data-testid="draft-topbar-league-draft-settings"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-[#7180a8]/20 text-white/85 transition duration-150 hover:bg-[#7b89af]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 active:scale-95"
              aria-label={t('draftRoom.topBar.aria.leagueDraftSettings')}
              title={t('draftRoom.topBar.leagueDraftSettings')}
            >
              <Settings2 className="h-4 w-4" />
            </Link>
          ) : isCommissioner ? (
            <button
              type="button"
              onClick={onCommissionerOpen}
              data-testid="draft-open-commissioner-controls"
              disabled={commissionerLoading}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-[#7180a8]/20 text-white/85 transition duration-150 hover:bg-[#7b89af]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 disabled:opacity-55 active:scale-95"
              aria-label={t('draftRoom.topBar.aria.commissioner')}
              title={t('draftRoom.topBar.commissioner')}
            >
              <Settings2 className="h-4 w-4" />
            </button>
          ) : null}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              data-testid="draft-topbar-menu-toggle"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-[#7180a8]/20 text-white/85 transition duration-150 hover:bg-[#7b89af]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 active:scale-95"
              aria-expanded={menuOpen}
              aria-label="Draft options"
            >
              <Menu className="h-4 w-4" />
            </button>

            {menuOpen ? (
              <div
                className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-white/12 bg-[#1d2638]/96 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl"
                data-testid="draft-topbar-menu"
              >
                <button
                  type="button"
                  onClick={() => {
                    void handleCopyInvite('menu')
                  }}
                  data-testid="draft-topbar-copy-invite"
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition duration-150 hover:bg-white/8"
                >
                  <Copy className="mt-0.5 h-4 w-4 text-[#dbe1ff]" />
                  <span>
                    <span className="block text-sm font-semibold text-white">Copy Invite Link</span>
                    <span className="block text-xs text-white/55">
                      Your friends can join via this link
                    </span>
                  </span>
                </button>

                {isCommissioner ? (
                  <button
                    type="button"
                    onClick={() => {
                      onCommissionerOpen?.()
                      setMenuOpen(false)
                    }}
                    data-testid="draft-topbar-set-order"
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition duration-150 hover:bg-white/8"
                  >
                    <LayoutGrid className="mt-0.5 h-4 w-4 text-[#dbe1ff]" />
                    <span>
                      <span className="block text-sm font-semibold text-white">Set Draft Order</span>
                      <span className="block text-xs text-white/55">Set or edit the draft order</span>
                    </span>
                  </button>
                ) : null}

                {isCommissioner ? (
                  <button
                    type="button"
                    onClick={() => {
                      onCommissionerOpen?.()
                      setMenuOpen(false)
                    }}
                    data-testid="draft-topbar-open-settings"
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition duration-150 hover:bg-white/8"
                  >
                    <Settings2 className="mt-0.5 h-4 w-4 text-[#dbe1ff]" />
                    <span>
                      <span className="block text-sm font-semibold text-white">Draft Settings</span>
                      <span className="block text-xs text-white/55">
                        Draft order, timer, scoring, and more
                      </span>
                    </span>
                  </button>
                ) : null}

                {draftStatus === 'pre_draft' && isCommissioner && onStartDraft ? (
                  <button
                    type="button"
                    onClick={() => {
                      onStartDraft()
                      setMenuOpen(false)
                    }}
                    data-testid="draft-topbar-menu-start"
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition duration-150 hover:bg-white/8"
                  >
                    <Sparkles className="mt-0.5 h-4 w-4 text-[#dbe1ff]" />
                    <span>
                      <span className="block text-sm font-semibold text-white">Start Draft</span>
                      <span className="block text-xs text-white/55">Finalize settings and start the draft now</span>
                    </span>
                  </button>
                ) : null}

                {(draftStatus === 'in_progress' || draftStatus === 'paused') && isCommissioner && onPause ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (draftStatus === 'paused') {
                        onResume?.()
                      } else {
                        onPause()
                      }
                      setMenuOpen(false)
                    }}
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition duration-150 hover:bg-white/8"
                  >
                    <Clock className="mt-0.5 h-4 w-4 text-[#dbe1ff]" />
                    <span>
                      <span className="block text-sm font-semibold text-white">
                        {draftStatus === 'paused' ? 'Resume Draft' : 'Pause Draft'}
                      </span>
                      <span className="block text-xs text-white/55">
                        {draftStatus === 'paused' ? 'Restart the draft timer' : 'Pause the current draft clock'}
                      </span>
                    </span>
                  </button>
                ) : null}

                {isCommissioner && onRunAiPick && isOrphanOnClock ? (
                  <button
                    type="button"
                    onClick={() => {
                      onRunAiPick()
                      setMenuOpen(false)
                    }}
                    disabled={runAiPickLoading}
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition duration-150 hover:bg-white/8 disabled:opacity-55"
                  >
                    <Sparkles className="mt-0.5 h-4 w-4 text-violet-200" />
                    <span>
                      <span className="block text-sm font-semibold text-white">
                        {runAiPickLoading ? 'Running AI Pick' : 'Run AI Pick'}
                      </span>
                      <span className="block text-xs text-white/55">
                        Trigger the orphan team drafter for the current pick
                      </span>
                    </span>
                  </button>
                ) : null}

                {isCommissioner && (onResetTimer || onUndoPick) ? (
                  <div className="mt-1 grid grid-cols-2 gap-2 border-t border-white/8 px-1 pt-3">
                    {onResetTimer ? (
                      <button
                        type="button"
                        onClick={() => {
                          onResetTimer()
                          setMenuOpen(false)
                        }}
                        className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white/82 transition duration-150 hover:bg-white/12"
                      >
                        Reset Timer
                      </button>
                    ) : null}
                    {onUndoPick ? (
                      <button
                        type="button"
                        onClick={() => {
                          onUndoPick()
                          setMenuOpen(false)
                        }}
                        className="rounded-xl border border-red-400/25 bg-red-500/12 px-3 py-2 text-xs text-red-100 transition duration-150 hover:bg-red-500/20"
                      >
                        Undo Pick
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {isReconnecting ? (
            <span className="self-center text-[10px] uppercase tracking-[0.14em] text-amber-300">
              Reconnecting
            </span>
          ) : null}
        </div>
      </div>

      {showUseQueue && onUseQueue ? (
        <div className="mt-3 flex justify-start lg:justify-end">
          <button
            type="button"
            onClick={onUseQueue}
            disabled={useQueueLoading}
            data-testid="draft-use-queue-button"
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-cyan-300/35 bg-gradient-to-r from-cyan-500/18 to-violet-500/12 px-4 py-2 text-xs font-semibold text-cyan-100 shadow-[0_8px_28px_rgba(34,211,238,0.15)] transition duration-150 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 disabled:opacity-55 active:scale-[0.98]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {useQueueLoading ? 'Using Queue...' : t('draftRoom.topBar.useQueue')}
          </button>
        </div>
      ) : null}
    </header>
  )
}
