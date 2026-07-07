'use client'

import { LIFECYCLE_KEY } from './MyLeagueCard'
import { WarRoomCard } from './WarRoomCard'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

const STAGE_ORDER = Object.keys(LIFECYCLE_KEY)

export function SeasonJourney({
  lifecycleState,
  currentWeek,
  tradeDeadlineWeek,
  playoffStartWeek,
}: {
  lifecycleState: string | null
  currentWeek: number | null
  tradeDeadlineWeek: number | null
  playoffStartWeek: number | null
}) {
  const { t, tInterpolate } = useLanguage()

  if (!lifecycleState) return null

  const currentIndex = STAGE_ORDER.indexOf(lifecycleState)

  // Week markers only render when we have a real currentWeek to compare against —
  // otherwise "in 3 weeks" would be a guess, not a fact.
  const tradeDeadlineNote =
    currentWeek != null && tradeDeadlineWeek != null
      ? tInterpolate('dashboard.warroom.seasonJourney.tradeDeadlineMarker', { week: tradeDeadlineWeek })
      : null
  const playoffsNote =
    currentWeek != null && playoffStartWeek != null
      ? tInterpolate('dashboard.warroom.seasonJourney.playoffsMarker', { week: playoffStartWeek })
      : null

  return (
    <WarRoomCard className="overflow-hidden p-4" accentBorder="rgba(255,255,255,0.08)">
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">
        {t('dashboard.warroom.seasonJourney.title')}
      </p>
      <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1">
        {STAGE_ORDER.map((stage, i) => {
          const isCurrent = i === currentIndex
          const isPast = currentIndex >= 0 && i < currentIndex
          return (
            <div key={stage} className="flex shrink-0 items-center gap-1">
              <span
                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  isCurrent
                    ? 'bg-cyan-500/20 text-cyan-200'
                    : isPast
                      ? 'text-white/30'
                      : 'text-white/15'
                }`}
              >
                {t(LIFECYCLE_KEY[stage])}
              </span>
              {i < STAGE_ORDER.length - 1 ? <span className="text-white/10">→</span> : null}
            </div>
          )
        })}
      </div>
      {tradeDeadlineNote || playoffsNote ? (
        <p className="mt-2.5 flex flex-wrap gap-x-3 text-[11px] text-white/45">
          {tradeDeadlineNote ? <span>{tradeDeadlineNote}</span> : null}
          {playoffsNote ? <span>{playoffsNote}</span> : null}
        </p>
      ) : null}
    </WarRoomCard>
  )
}
