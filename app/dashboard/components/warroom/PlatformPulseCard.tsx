'use client'

import { useState } from 'react'
import {
  Radar,
  Zap,
  HeartPulse,
  Sparkles,
  UserPlus,
  ArrowRightLeft,
  Clock,
  CalendarClock,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'
import { WarRoomCard } from './WarRoomCard'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { DeltaChip, ConfidenceChip } from './trajectory'
import { PULSE_CATEGORY } from '@/lib/dashboard/color-grammar'
import type { PlatformPulseItem, PulseKind } from '@/lib/platform-pulse'

/** Kind → intelligence icon (variety at a glance). */
const KIND_ICON: Record<PulseKind, LucideIcon> = {
  lineup_urgent: Zap,
  injury_watch: HeartPulse,
  ai_recommendation: Sparkles,
  waiver_pickups: UserPlus,
  pending_trades: ArrowRightLeft,
  expiring_trade: Clock,
  draft_soon: CalendarClock,
  league_health_low: ShieldAlert,
  league_needs_attention: ShieldAlert,
}

const KNOWN_METRICS = new Set(['health', 'engagement', 'fairness', 'sustainability'])

/**
 * Platform Pulse (Phase 3.8B) — the dashboard's executive briefing. The lead item
 * dominates (priority band + kind icon + rich "Why" bullets); the rest are compact
 * rows. Duplicate same-league signals are already collapsed by the engine into one
 * summarized item, so no headline ever repeats. Every value is real — confidence,
 * trajectory, and reasoning are only ever passed through from a source.
 */
export function PlatformPulseCard({ items }: { items: PlatformPulseItem[] }) {
  const { t, tInterpolate } = useLanguage()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  if (items.length === 0) return null

  const metricLabel = (metric?: string) =>
    metric && KNOWN_METRICS.has(metric) ? t(`dashboard.pulse.metric.${metric}`) : metric ?? ''

  const titleOf = (item: PlatformPulseItem): string => {
    const d = item.data
    const many = (d.count ?? 0) > 1
    switch (item.kind) {
      case 'lineup_urgent':
        return many ? tInterpolate('dashboard.pulse.kind.lineupUrgentMany', { count: d.count ?? 0 }) : t('dashboard.pulse.kind.lineupUrgent')
      case 'injury_watch':
        return many ? tInterpolate('dashboard.pulse.kind.injuryWatchMany', { count: d.count ?? 0 }) : t('dashboard.pulse.kind.injuryWatch')
      case 'ai_recommendation':
        return many ? tInterpolate('dashboard.pulse.kind.aiRecommendationMany', { count: d.count ?? 0 }) : t('dashboard.pulse.kind.aiRecommendation')
      case 'waiver_pickups':
        return t('dashboard.pulse.kind.waiverPickups')
      case 'pending_trades':
        return t('dashboard.pulse.kind.pendingTrades')
      case 'expiring_trade':
        return t('dashboard.pulse.kind.expiringTrade')
      case 'draft_soon':
        return t('dashboard.pulse.kind.draftSoon')
      case 'league_health_low':
        return tInterpolate('dashboard.pulse.kind.healthLow', { metric: metricLabel(d.metric) })
      case 'league_needs_attention':
        return t('dashboard.pulse.kind.needsAttention')
      default:
        return item.leagueName ?? ''
    }
  }

  const summaryOf = (item: PlatformPulseItem): string => {
    const d = item.data
    const league = d.leagueName ?? item.leagueName ?? ''
    const many = (d.count ?? 0) > 1
    switch (item.kind) {
      case 'lineup_urgent':
        return league
      case 'injury_watch':
      case 'ai_recommendation':
        return !many && d.playerName ? `${d.playerName} · ${league}` : league
      case 'waiver_pickups':
        return tInterpolate('dashboard.pulse.summary.count', { count: d.count ?? 0 })
      case 'pending_trades':
        return tInterpolate('dashboard.pulse.summary.pending', { count: d.count ?? 0 })
      case 'draft_soon':
        return tInterpolate('dashboard.pulse.summary.draft', { league, hours: d.hoursUntil ?? 0 })
      case 'league_health_low':
      case 'league_needs_attention':
        return tInterpolate('dashboard.pulse.summary.score', { league, score: d.score ?? 0 })
      default:
        return league
    }
  }

  /** Shared expandable "Why" — bulleted whyDetails when present, else the single reason. */
  const whyBlock = (item: PlatformPulseItem) => {
    const details = item.whyDetails?.filter(Boolean) ?? []
    const hasDetails = details.length > 0
    if (!hasDetails && !item.why) return null
    const isOpen = open[item.id] === true
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen((o) => ({ ...o, [item.id]: !o[item.id] }))}
          aria-expanded={isOpen}
          className="mt-1.5 text-[10px] font-semibold text-violet-300/70 transition hover:text-violet-200"
        >
          {t('dashboard.pulse.why')}
        </button>
        {isOpen ? (
          hasDetails ? (
            <ul className="warroom-reveal mt-1.5 space-y-1">
              {details.slice(0, 5).map((d, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] leading-snug text-white/60">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-white/30" aria-hidden />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="warroom-reveal mt-1.5 text-[11px] leading-snug text-white/55">{item.why}</p>
          )
        ) : null}
      </>
    )
  }

  const Badge = ({ item }: { item: PlatformPulseItem }) => (
    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${PULSE_CATEGORY[item.category].badge}`}>
      {t(`dashboard.pulse.category.${item.category}`)}
    </span>
  )

  const [lead, ...rest] = items
  const LeadIcon = KIND_ICON[lead.kind] ?? Radar

  return (
    <WarRoomCard className="warroom-fade-in-stagger overflow-hidden" accentBorder="rgba(139,92,246,0.22)">
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-2.5">
        <Radar className="h-3.5 w-3.5 text-violet-300/80" aria-hidden />
        <p className="text-[11px] font-bold uppercase tracking-widest text-violet-200/80">{t('dashboard.pulse.title')}</p>
      </div>

      {/* Lead item — dominant. Accent rail + icon tile both carry the lead's category
          color (Predict blue · Monitor amber · Recommend emerald · Explain purple). */}
      <div className="relative overflow-hidden border-b border-white/[0.06] px-4 py-3.5">
        <span className={`absolute inset-y-0 left-0 w-1 ${PULSE_CATEGORY[lead.category].bar}`} aria-hidden />
        <div className="flex items-start gap-3 pl-1.5">
          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${PULSE_CATEGORY[lead.category].iconTile}`}>
            <LeadIcon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge item={lead} />
              {lead.trajectory ? <DeltaChip summary={lead.trajectory} /> : null}
              {lead.confidence != null ? <ConfidenceChip confidence={lead.confidence} /> : null}
            </div>
            <p className="mt-1 text-[15px] font-black leading-tight text-white">{titleOf(lead)}</p>
            <p className="mt-0.5 truncate text-[12px] text-white/55">{summaryOf(lead)}</p>
            {whyBlock(lead)}
          </div>
        </div>
      </div>

      {/* Remaining items — compact. */}
      {rest.length > 0 ? (
        <ul>
          {rest.map((item) => {
            const Icon = KIND_ICON[item.kind] ?? Radar
            return (
              <li key={item.id} className="border-b border-white/[0.04] px-4 py-2.5 last:border-b-0">
                <div className="flex items-start gap-2.5">
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${PULSE_CATEGORY[item.category].iconTile}`}>
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge item={item} />
                      <span className="truncate text-[12px] font-semibold text-white/90">{titleOf(item)}</span>
                      {item.trajectory ? <DeltaChip summary={item.trajectory} /> : null}
                      {item.confidence != null ? <ConfidenceChip confidence={item.confidence} /> : null}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-white/45">{summaryOf(item)}</p>
                    {whyBlock(item)}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </WarRoomCard>
  )
}
