'use client'

import { Clock, DollarSign, ShieldAlert, Sparkles } from 'lucide-react'
import type { LineupActionItem } from '@/lib/lineup-actions/types'
import { WarRoomCard } from './WarRoomCard'

type TimelineEntry = {
  key: string
  icon: typeof Clock
  label: string
  detail: string
  /** ms epoch when known — used to sort; entries without a known time sort last. */
  atMs: number | null
}

function formatRelativeTime(iso: string): string {
  const target = new Date(iso).getTime()
  const now = Date.now()
  const diffMs = target - now
  const absMin = Math.round(Math.abs(diffMs) / 60000)
  if (absMin < 60) return diffMs >= 0 ? `in ${absMin}m` : `${absMin}m ago`
  const hours = Math.round(absMin / 60)
  if (hours < 24) return diffMs >= 0 ? `in ${hours}h` : `${hours}h ago`
  const days = Math.round(hours / 24)
  return diffMs >= 0 ? `in ${days}d` : `${days}d ago`
}

export function TodayTimeline({
  lineupActions,
  waiverTiming,
  autoSwapsLast24h,
  pendingTradeCount,
}: {
  lineupActions: LineupActionItem[]
  waiverTiming: { nextWaiverProcessKnown: boolean; nextWaiverProcessIsoUtc: string | null } | null
  autoSwapsLast24h: number
  pendingTradeCount: number
}) {
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
      label: `Lineup locks — ${nextLock.a.leagueName}`,
      detail: formatRelativeTime(nextLock.a.lockTime as string),
      atMs: nextLock.ms,
    })
  }

  if (waiverTiming?.nextWaiverProcessKnown && waiverTiming.nextWaiverProcessIsoUtc) {
    entries.push({
      key: 'waivers',
      icon: DollarSign,
      label: 'Waivers process',
      detail: formatRelativeTime(waiverTiming.nextWaiverProcessIsoUtc),
      atMs: new Date(waiverTiming.nextWaiverProcessIsoUtc).getTime(),
    })
  }

  if (autoSwapsLast24h > 0) {
    entries.push({
      key: 'auto-protection',
      icon: ShieldAlert,
      label:
        autoSwapsLast24h === 1
          ? 'Auto lineup protection made 1 swap'
          : `Auto lineup protection made ${autoSwapsLast24h} swaps`,
      detail: 'Last 24 hours',
      atMs: null,
    })
  }

  if (pendingTradeCount > 0) {
    entries.push({
      key: 'trades-open',
      icon: Sparkles,
      label: pendingTradeCount === 1 ? '1 trade offer open' : `${pendingTradeCount} trade offers open`,
      detail: 'No deadline set',
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
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">Today</p>
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
