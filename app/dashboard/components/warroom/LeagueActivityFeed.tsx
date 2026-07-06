'use client'

import { ArrowRightLeft, LayoutGrid, Megaphone, MessageSquare, UserPlus } from 'lucide-react'
import { useActivityFeed } from '@/hooks/useActivityFeed'
import { WarRoomCard } from './WarRoomCard'

const TYPE_ICON = {
  trade: ArrowRightLeft,
  waiver: UserPlus,
  lineup: LayoutGrid,
  message: MessageSquare,
  announcement: Megaphone,
} as const

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

/** Dark "war room" presentation over the real activity feed (same data hook the light-mode ActivityFeed uses). */
export function LeagueActivityFeed() {
  const { items, loading } = useActivityFeed({ limit: 12 })

  if (!loading && items.length === 0) return null

  return (
    <WarRoomCard className="overflow-hidden" accentBorder="rgba(255,255,255,0.08)">
      <div className="border-b border-white/[0.06] px-4 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">League Activity</p>
      </div>
      {loading ? (
        <div className="px-4 py-6 text-center text-[11px] text-white/30">Loading activity…</div>
      ) : (
        <ul className="max-h-[280px] overflow-y-auto">
          {items.slice(0, 12).map((item) => {
            const Icon = TYPE_ICON[item.type] ?? Megaphone
            return (
              <li key={item.id} className="flex items-start gap-2.5 border-b border-white/[0.04] px-4 py-2.5 last:border-b-0">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-white/50">
                  <Icon className="h-3 w-3" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] text-white/80">{item.description}</p>
                  {/* Relative-time text is computed from Date.now() and legitimately differs
                      between server-render and client-hydration instants — not a real mismatch. */}
                  <p className="mt-0.5 text-[10px] text-white/30" suppressHydrationWarning>
                    {item.leagueName ? `${item.leagueName} · ` : ''}
                    {formatRelativeTime(item.timestamp)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </WarRoomCard>
  )
}
