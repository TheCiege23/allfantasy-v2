'use client'

import { useState } from 'react'
import { Radar } from 'lucide-react'
import { WarRoomCard } from './WarRoomCard'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { DeltaChip, ConfidenceChip } from './trajectory'
import type { PlatformPulseItem, PulseCategory } from '@/lib/platform-pulse'

const CATEGORY_TONE: Record<PulseCategory, string> = {
  Predict: 'bg-violet-500/15 text-violet-300',
  Monitor: 'bg-amber-500/15 text-amber-300',
  Recommend: 'bg-cyan-500/15 text-cyan-300',
  Explain: 'bg-emerald-500/15 text-emerald-300',
}

/** Priority indicator — a small dot, hotter for higher priority. */
function priorityDot(priority: number): string {
  if (priority >= 80) return 'bg-red-400'
  if (priority >= 60) return 'bg-amber-400'
  return 'bg-white/30'
}

const KNOWN_METRICS = new Set(['health', 'engagement', 'fairness', 'sustainability'])

/**
 * Platform Pulse (Phase 3.6) — the cross-context intelligence briefing. Renders the
 * top ranked pulse items (already selected/capped by the pure engine) with a
 * category badge, priority dot, concise localized summary, and — only when real —
 * a confidence chip, a trajectory delta chip, and a "Why?" affordance. Self-gates
 * to null when the engine returns nothing, so a quiet dashboard shows no card.
 */
export function PlatformPulseCard({ items }: { items: PlatformPulseItem[] }) {
  const { t, tInterpolate } = useLanguage()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  if (items.length === 0) return null

  const metricLabel = (metric?: string) =>
    metric && KNOWN_METRICS.has(metric) ? t(`dashboard.pulse.metric.${metric}`) : metric ?? ''

  const titleOf = (item: PlatformPulseItem): string => {
    const d = item.data
    switch (item.kind) {
      case 'lineup_urgent':
        return t('dashboard.pulse.kind.lineupUrgent')
      case 'injury_watch':
        return t('dashboard.pulse.kind.injuryWatch')
      case 'ai_recommendation':
        return t('dashboard.pulse.kind.aiRecommendation')
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
    switch (item.kind) {
      case 'lineup_urgent':
        return league
      case 'injury_watch':
      case 'ai_recommendation':
        return d.playerName ? `${d.playerName} · ${league}` : league
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

  return (
    <WarRoomCard className="warroom-fade-in-stagger overflow-hidden" accentBorder="rgba(139,92,246,0.22)">
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-2.5">
        <Radar className="h-3.5 w-3.5 text-violet-300/80" aria-hidden />
        <p className="text-[11px] font-bold uppercase tracking-widest text-violet-200/80">
          {t('dashboard.pulse.title')}
        </p>
      </div>

      <ul>
        {items.map((item) => {
          const why = item.why
          const isOpen = open[item.id] === true
          return (
            <li key={item.id} className="border-b border-white/[0.04] px-4 py-2.5 last:border-b-0">
              <div className="flex items-start gap-2.5">
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${priorityDot(item.priority)}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${CATEGORY_TONE[item.category]}`}>
                      {t(`dashboard.pulse.category.${item.category}`)}
                    </span>
                    <span className="truncate text-[12px] font-semibold text-white/90">{titleOf(item)}</span>
                    {item.trajectory ? <DeltaChip summary={item.trajectory} /> : null}
                    {item.confidence != null ? <ConfidenceChip confidence={item.confidence} /> : null}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-white/45">{summaryOf(item)}</p>

                  {why ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setOpen((o) => ({ ...o, [item.id]: !o[item.id] }))}
                        aria-expanded={isOpen}
                        className="mt-1 text-[10px] font-semibold text-violet-300/70 hover:text-violet-200"
                      >
                        {t('dashboard.pulse.why')}
                      </button>
                      {isOpen ? <p className="mt-1 text-[11px] leading-snug text-white/55">{why}</p> : null}
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </WarRoomCard>
  )
}
