'use client'

import { Clock, DollarSign, ShieldAlert, Sparkles, Swords, Calendar } from 'lucide-react'
import type { LineupActionItem } from '@/lib/lineup-actions/types'
import type { ExpiringNativeTrade } from '@/lib/dashboard-strip/fetchExpiringNativeTrades'
import { WarRoomCard } from './WarRoomCard'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import type { InterpolationVars } from '@/lib/i18n/tInterpolate'

export type UpcomingDraft = { leagueId: string; leagueName: string; draftDate: string }

type TimelineEntry = {
  key: string
  icon: typeof Clock
  label: string
  detail: string
  /** ms epoch when known — used to sort; entries without a known time sort last. */
  atMs: number | null
}

export function formatRelativeTime(
  iso: string,
  tInterpolate: (key: string, vars?: InterpolationVars) => string,
): string {
  const target = new Date(iso).getTime()
  const now = Date.now()
  const diffMs = target - now
  const future = diffMs >= 0
  const absMin = Math.round(Math.abs(diffMs) / 60000)
  if (absMin < 60) {
    return tInterpolate(future ? 'dashboard.warroom.time.inMinutes' : 'dashboard.warroom.time.minutesAgo', { n: absMin })
  }
  const hours = Math.round(absMin / 60)
  if (hours < 24) {
    return tInterpolate(future ? 'dashboard.warroom.time.inHours' : 'dashboard.warroom.time.hoursAgo', { n: hours })
  }
  const days = Math.round(hours / 24)
  return tInterpolate(future ? 'dashboard.warroom.time.inDays' : 'dashboard.warroom.time.daysAgo', { n: days })
}

export function TodayTimeline({
  lineupActions,
  waiverTiming,
  autoSwapsLast24h,
  pendingTradeCount,
  upcomingDrafts = [],
  expiringNativeTrades = [],
}: {
  lineupActions: LineupActionItem[]
  waiverTiming: { nextWaiverProcessKnown: boolean; nextWaiverProcessIsoUtc: string | null } | null
  autoSwapsLast24h: number
  pendingTradeCount: number
  upcomingDrafts?: UpcomingDraft[]
  expiringNativeTrades?: ExpiringNativeTrade[]
}) {
  const { t, tInterpolate } = useLanguage()
  const entries: TimelineEntry[] = []

  const nextLock = lineupActions
    .filter((a) => a.lockTime)
    .map((a) => ({ a, ms: new Date(a.lockTime as string).getTime() }))
    .filter((x) => Number.isFinite(x.ms))
    .sort((x, y) => x.ms - y.ms)[0]

  if (nextLock) {
    entries.push({
      key: 'lineup-lock',
      icon: Clock,
      label: tInterpolate('dashboard.warroom.today.lineupLocks', { league: nextLock.a.leagueName }),
      detail: formatRelativeTime(nextLock.a.lockTime as string, tInterpolate),
      atMs: nextLock.ms,
    })
  }

  if (waiverTiming?.nextWaiverProcessKnown && waiverTiming.nextWaiverProcessIsoUtc) {
    entries.push({
      key: 'waivers',
      icon: DollarSign,
      label: t('dashboard.warroom.today.waiversProcess'),
      detail: formatRelativeTime(waiverTiming.nextWaiverProcessIsoUtc, tInterpolate),
      atMs: new Date(waiverTiming.nextWaiverProcessIsoUtc).getTime(),
    })
  }

  const nextDraft = [...upcomingDrafts].sort(
    (a, b) => new Date(a.draftDate).getTime() - new Date(b.draftDate).getTime(),
  )[0]
  if (nextDraft) {
    entries.push({
      key: `draft-${nextDraft.leagueId}`,
      icon: Calendar,
      label: tInterpolate('dashboard.warroom.today.draftStartsSoon', { league: nextDraft.leagueName }),
      detail: formatRelativeTime(nextDraft.draftDate, tInterpolate),
      atMs: new Date(nextDraft.draftDate).getTime(),
    })
  }

  const nextExpiringTrade = [...expiringNativeTrades].sort(
    (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
  )[0]
  if (nextExpiringTrade) {
    entries.push({
      key: `trade-expiring-${nextExpiringTrade.tradeId}`,
      icon: Swords,
      label: tInterpolate('dashboard.warroom.today.tradeExpiringSoon', { league: nextExpiringTrade.leagueName }),
      detail: formatRelativeTime(nextExpiringTrade.expiresAt, tInterpolate),
      atMs: new Date(nextExpiringTrade.expiresAt).getTime(),
    })
  }

  if (autoSwapsLast24h > 0) {
    entries.push({
      key: 'auto-protection',
      icon: ShieldAlert,
      label:
        autoSwapsLast24h === 1
          ? t('dashboard.warroom.today.autoSwapOne')
          : tInterpolate('dashboard.warroom.today.autoSwapMany', { n: autoSwapsLast24h }),
      detail: t('dashboard.warroom.today.last24Hours'),
      atMs: null,
    })
  }

  if (pendingTradeCount > 0) {
    entries.push({
      key: 'trades-open',
      icon: Sparkles,
      label:
        pendingTradeCount === 1
          ? t('dashboard.warroom.today.tradeOpenOne')
          : tInterpolate('dashboard.warroom.today.tradeOpenMany', { n: pendingTradeCount }),
      detail: t('dashboard.warroom.today.noDeadlineSet'),
      atMs: null,
    })
  }

  const sorted = [...entries].sort((a, b) => {
    if (a.atMs === null && b.atMs === null) return 0
    if (a.atMs === null) return 1
    if (b.atMs === null) return -1
    return a.atMs - b.atMs
  })

  if (sorted.length === 0) return null

  return (
    <WarRoomCard className="overflow-hidden" accentBorder="rgba(255,255,255,0.08)">
      <div className="border-b border-white/[0.06] px-4 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">
          {t('dashboard.warroom.today.title')}
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-white/[0.04]">
        {sorted.map((entry) => {
          const Icon = entry.icon
          return (
            <li key={entry.key} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-white/60">
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-white/80">{entry.label}</span>
              {/* Relative-time text is computed from Date.now() and legitimately differs
                  between server-render and client-hydration instants — not a real mismatch. */}
              <span className="shrink-0 text-[11px] text-white/40" suppressHydrationWarning>
                {entry.detail}
              </span>
            </li>
          )
        })}
      </ul>
    </WarRoomCard>
  )
}
