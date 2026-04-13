'use client'

import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { interpolateTemplate } from '@/lib/i18n/interpolate'
import type { UserLeague } from '../types'

export type LineupChipState = 'preview' | 'issues' | 'clear'

export type TodayStripProps = {
  leagues: UserLeague[]
  /** How to label the lineup chip after optional API check. */
  lineupChipState: LineupChipState
  /** Preview: usually leagues.length; issues: API totalIssues; clear: unused for label. */
  lineupCount: number
  onLineupIssuesClick: () => void
  waiverCount: number
  onWaiverClick: () => void
  pendingTradeCount: number
  onTradesClick: () => void
}

/**
 * Attention items for "Today" — chips open lazy-loaded modals when wired.
 */
export function TodayStrip({
  leagues,
  lineupChipState,
  lineupCount,
  onLineupIssuesClick,
  waiverCount,
  onWaiverClick,
  pendingTradeCount,
  onTradesClick,
}: TodayStripProps) {
  const { t } = useLanguage()

  if (leagues.length === 0) {
    return null
  }

  const issueLabel =
    lineupCount === 1
      ? t('dashboard.today.lineupIssueOne')
      : interpolateTemplate(t('dashboard.today.lineupIssueMany'), { n: lineupCount })
  const previewLabel =
    lineupCount === 1
      ? t('dashboard.today.lineupToSetOne')
      : interpolateTemplate(t('dashboard.today.lineupToSetMany'), { n: lineupCount })

  const waiverChipLabel =
    waiverCount > 0
      ? waiverCount === 1
        ? t('dashboard.today.waiverRecOne')
        : interpolateTemplate(t('dashboard.today.waiverRecs'), { n: waiverCount })
      : t('dashboard.today.checkWaivers')

  const tradeChipLabel =
    pendingTradeCount > 0
      ? pendingTradeCount === 1
        ? t('dashboard.today.pendingTradeOne')
        : interpolateTemplate(t('dashboard.today.pendingTrades'), { n: pendingTradeCount })
      : t('dashboard.today.checkTrades')

  return (
    <section className="space-y-1.5">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-white/35">
        {t('dashboard.today.title')}
      </p>
      <div className="scrollbar-none flex gap-2 overflow-x-auto py-1">
        <button
          type="button"
          onClick={onWaiverClick}
          className={
            waiverCount > 0
              ? 'inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-[13px] text-cyan-400 transition hover:border-cyan-500/35 hover:bg-cyan-500/20'
              : 'inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-[13px] text-white/75 transition hover:bg-white/[0.10]'
          }
        >
          {waiverChipLabel}
        </button>
        {lineupChipState === 'clear' ? (
          <button
            type="button"
            onClick={onLineupIssuesClick}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[13px] text-emerald-400 transition-colors hover:border-emerald-500/35 hover:bg-emerald-500/15"
          >
            {t('dashboard.today.lineupsGood')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onLineupIssuesClick}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-[13px] text-amber-400 transition-colors hover:border-amber-500/30 hover:bg-amber-500/20"
          >
            ⚠ {lineupChipState === 'preview' ? previewLabel : issueLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onTradesClick}
          className={
            pendingTradeCount > 0
              ? 'inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-[13px] text-amber-400 transition hover:border-amber-500/35 hover:bg-amber-500/20'
              : 'inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-[13px] text-white/75 transition hover:bg-white/[0.10]'
          }
        >
          {tradeChipLabel}
        </button>
      </div>
    </section>
  )
}
