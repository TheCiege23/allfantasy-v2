'use client'

import { AlertTriangle, ArrowRightLeft, Flame, Swords, UserPlus } from 'lucide-react'
import type { LineupActionItem } from '@/lib/lineup-actions/types'
import { WarRoomCard } from './WarRoomCard'

type PriorityTier = 'urgent' | 'high' | 'normal'

type ActionRow = {
  key: string
  tier: PriorityTier
  icon: typeof Flame
  label: string
  detail: string
  onClick: () => void
}

const TIER_STYLE: Record<PriorityTier, { color: string; badge: string }> = {
  urgent: { color: '#f87171', badge: 'Urgent' },
  high: { color: '#fbbf24', badge: 'Soon' },
  normal: { color: '#22d3ee', badge: 'Open' },
}

function urgencyTier(severity: LineupActionItem['severity']): PriorityTier {
  if (severity === 'critical') return 'urgent'
  if (severity === 'warning') return 'high'
  return 'normal'
}

export function ActionCenter({
  lineupActions,
  waiverPickupSuggestions,
  pendingTradeCount,
  warRoomDecisionsToReview,
  onLineupIssuesClick,
  onWaiverClick,
  onTradesClick,
  onWarRoomClick,
}: {
  lineupActions: LineupActionItem[]
  waiverPickupSuggestions: number
  pendingTradeCount: number
  warRoomDecisionsToReview: number
  onLineupIssuesClick: () => void
  onWaiverClick: () => void
  onTradesClick: () => void
  onWarRoomClick: () => void
}) {
  const rows: ActionRow[] = []

  // Real per-slot lineup issues first, worst severity first (data already scanned in DashboardOverview).
  const sortedLineupActions = [...lineupActions]
    .filter((a) => a.severity !== 'info')
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1))
    .slice(0, 4)

  for (const action of sortedLineupActions) {
    rows.push({
      key: `lineup-${action.leagueId}-${action.slotId ?? action.playerId ?? action.slotIndex}`,
      tier: urgencyTier(action.severity),
      icon: AlertTriangle,
      label: action.playerName ? `${action.recommendedAction ?? 'Review'}: ${action.playerName}` : action.message,
      detail: `${action.leagueName}${action.lockTime ? ` · locks soon` : ''}`,
      onClick: onLineupIssuesClick,
    })
  }

  if (waiverPickupSuggestions > 0) {
    rows.push({
      key: 'waiver',
      tier: 'high',
      icon: UserPlus,
      label:
        waiverPickupSuggestions === 1
          ? '1 waiver pickup suggestion'
          : `${waiverPickupSuggestions} waiver pickup suggestions`,
      detail: 'Review recommended adds',
      onClick: onWaiverClick,
    })
  }

  if (pendingTradeCount > 0) {
    rows.push({
      key: 'trade',
      tier: 'normal',
      icon: ArrowRightLeft,
      label: pendingTradeCount === 1 ? '1 trade offer pending' : `${pendingTradeCount} trade offers pending`,
      detail: 'Accept, counter, or decline',
      onClick: onTradesClick,
    })
  }

  if (warRoomDecisionsToReview > 0) {
    rows.push({
      key: 'warroom',
      tier: 'normal',
      icon: Swords,
      label:
        warRoomDecisionsToReview === 1
          ? '1 War Room decision to review'
          : `${warRoomDecisionsToReview} War Room decisions to review`,
      detail: 'Draft picks, lineup calls, and more',
      onClick: onWarRoomClick,
    })
  }

  if (rows.length === 0) {
    return (
      <WarRoomCard className="p-4 text-center" accentBorder="rgba(52,211,153,0.2)">
        <p className="text-[13px] font-semibold text-emerald-300">You&apos;re all caught up 🎉</p>
        <p className="mt-1 text-[11px] text-white/45">No urgent decisions across your leagues right now.</p>
      </WarRoomCard>
    )
  }

  return (
    <WarRoomCard className="overflow-hidden" accentBorder="rgba(255,255,255,0.08)">
      <div className="border-b border-white/[0.06] px-4 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">Action Center</p>
      </div>
      <ul>
        {rows.map((row) => {
          const Icon = row.icon
          const style = TIER_STYLE[row.tier]
          return (
            <li key={row.key} className="border-b border-white/[0.04] last:border-b-0">
              <button
                type="button"
                onClick={row.onClick}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `${style.color}1f`, color: style.color }}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-white/90">{row.label}</span>
                  <span className="block truncate text-[11px] text-white/40">{row.detail}</span>
                </span>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                  style={{ color: style.color, background: `${style.color}1a` }}
                >
                  {style.badge}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </WarRoomCard>
  )
}
