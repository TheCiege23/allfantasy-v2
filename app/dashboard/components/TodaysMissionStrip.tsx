'use client'

import Link from 'next/link'
import { Swords, Sparkles, Activity, Search, Trophy } from 'lucide-react'

type MissionCard = {
  key: string
  icon: React.ReactNode
  title: string
  reason: string
  urgency: 'active' | 'ready' | 'watch'
  badge?: string
  href?: string
  onClick?: () => void
}

type TodaysMissionStripProps = {
  warRoomDecisions: number
  pendingTrades: number
  waiverSuggestions: number
  onWarRoomClick: () => void
  onChimmyClick: () => void
  onTradesClick: () => void
  onWaiverClick: () => void
}

const URGENCY: Record<'active' | 'ready' | 'watch', { card: string; chip: string; label: string }> = {
  active: {
    card: 'border-cyan-500/30 bg-gradient-to-r from-cyan-500/[0.09] to-transparent shadow-[0_0_15px_rgba(34,211,238,0.06)]',
    chip: 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300',
    label: 'Active',
  },
  ready: {
    card: 'border-violet-500/25 bg-gradient-to-r from-violet-500/[0.07] to-transparent',
    chip: 'border-violet-500/40 bg-violet-500/20 text-violet-300',
    label: 'Ready',
  },
  watch: {
    card: 'border-white/[0.07] bg-white/[0.02]',
    chip: 'border-white/15 bg-white/[0.06] text-white/50',
    label: 'Info',
  },
}

export function TodaysMissionStrip({
  warRoomDecisions,
  pendingTrades,
  waiverSuggestions,
  onWarRoomClick,
  onChimmyClick,
  onTradesClick,
  onWaiverClick,
}: TodaysMissionStripProps) {
  const cards: MissionCard[] = [
    {
      key: 'war-room',
      icon: <Swords className="h-4 w-4" />,
      title: 'Open War Room',
      reason: warRoomDecisions > 0 ? `${warRoomDecisions} decisions ready for review` : 'NFL draft intelligence is active',
      urgency: 'active',
      badge: warRoomDecisions > 0 ? String(warRoomDecisions) : undefined,
      onClick: onWarRoomClick,
    },
    {
      key: 'chimmy',
      icon: <Sparkles className="h-4 w-4" />,
      title: 'Ask Chimmy',
      reason: 'Get personalized roster strategy and matchup outlook',
      urgency: 'ready',
      onClick: onChimmyClick,
    },
    ...(pendingTrades > 0
      ? [
          {
            key: 'trades',
            icon: <Activity className="h-4 w-4" />,
            title: 'Review Trades',
            reason: `${pendingTrades} pending trade${pendingTrades > 1 ? 's' : ''} need your attention`,
            urgency: 'watch' as const,
            badge: String(pendingTrades),
            onClick: onTradesClick,
          },
        ]
      : []),
    ...(waiverSuggestions > 0
      ? [
          {
            key: 'waivers',
            icon: <Search className="h-4 w-4" />,
            title: 'Waiver Pickups',
            reason: `${waiverSuggestions} pickup${waiverSuggestions > 1 ? 's' : ''} recommended this week`,
            urgency: 'watch' as const,
            badge: String(waiverSuggestions),
            onClick: onWaiverClick,
          },
        ]
      : []),
    {
      key: 'rankings',
      icon: <Trophy className="h-4 w-4" />,
      title: 'View Legacy',
      reason: 'Track your AF rank, tier, and championship history',
      urgency: 'watch',
      href: '/af-rankings',
    },
  ].slice(0, 5)

  return (
    <section>
      <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-white/40">
        Today&apos;s Mission
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {cards.map((card) => {
          const style = URGENCY[card.urgency]
          const inner = (
            <>
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${style.chip}`}
                >
                  {card.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-white/90">{card.title}</span>
                    {card.badge && (
                      <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${style.chip}`}>
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-white/45">{card.reason}</p>
                </div>
              </div>
            </>
          )

          const baseClass = `group relative flex min-w-[200px] flex-1 cursor-pointer items-center rounded-xl border px-4 py-3 text-left transition hover:opacity-90 active:scale-[0.98] sm:max-w-[260px] ${style.card}`

          return card.href ? (
            <Link key={card.key} href={card.href} className={baseClass}>
              {inner}
            </Link>
          ) : (
            <button key={card.key} type="button" onClick={card.onClick} className={baseClass}>
              {inner}
            </button>
          )
        })}
      </div>
    </section>
  )
}
