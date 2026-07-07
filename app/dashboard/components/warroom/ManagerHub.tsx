'use client'

import type { UserLeague } from '../../types'
import type { WaiverDashboardResponse } from '@/app/dashboard/dashboardStripApiTypes'
import { PowerRankingsMiniCard } from '@/components/ai-tools/PowerRankingsMiniCard'
import { InjuryImpactMiniCard } from '@/components/ai-tools/InjuryImpactMiniCard'
import { MatchupPrepMiniCard } from '@/components/ai-tools/MatchupPrepMiniCard'
import { MatchupPreviewCard } from './MatchupPreviewCard'
import { WaiverWirePreview } from './WaiverWirePreview'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

function hasLiveMatchups(league: UserLeague): boolean {
  const stage = league.lifecycleState || league.status
  return stage === 'in_season' || stage === 'playoffs'
}

export function ManagerHub({
  leagues,
  userId,
  selectedLeagueId,
  selectedLeague,
  onSelectLeagueId,
  waiverData,
  onOpenWaiverAll,
}: {
  leagues: UserLeague[]
  userId: string | null
  selectedLeagueId: string | null
  selectedLeague: UserLeague | null
  onSelectLeagueId: (id: string) => void
  waiverData: WaiverDashboardResponse | null
  onOpenWaiverAll: () => void
}) {
  const { t } = useLanguage()
  const inSeasonLeagues = leagues.filter(hasLiveMatchups)

  return (
    <section className="space-y-3">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-wider text-white/30">
          {t('dashboard.warroom.managerHub.title')}
        </p>
        <p className="mt-1 max-w-xl text-[11px] leading-snug text-white/45">
          {t('dashboard.overview.leagueIntelligenceSubtitle')}
        </p>
      </div>

      {inSeasonLeagues.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {inSeasonLeagues.slice(0, 4).map((l) => (
            <MatchupPreviewCard key={l.id} league={l} userId={userId} />
          ))}
        </div>
      ) : null}

      <WaiverWirePreview data={waiverData} onOpenAll={onOpenWaiverAll} />

      {leagues.length > 1 ? (
        <label className="block max-w-md text-[10px] font-bold uppercase tracking-wide text-white/40">
          {t('dashboard.overview.leagueSelectorLabel')}
          <select
            value={selectedLeagueId ?? ''}
            onChange={(e) => {
              const id = e.target.value
              onSelectLeagueId(id)
              try {
                const url = new URL(window.location.href)
                url.searchParams.set('league', id)
                window.history.replaceState({}, '', url.toString())
              } catch {
                /* ignore */
              }
            }}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0a1220] px-3 py-2 text-[13px] text-white/90"
          >
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.sport})
              </option>
            ))}
          </select>
        </label>
      ) : leagues.length === 1 && selectedLeague ? (
        <p className="text-[11px] text-cyan-200/85">
          <span className="inline-flex max-w-full items-center truncate rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-semibold text-white/90">
            {selectedLeague.name}
          </span>{' '}
          <span className="text-white/45">{String(selectedLeague.sport)}</span>
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <PowerRankingsMiniCard leagues={leagues} selectedLeagueId={selectedLeagueId} />
        <InjuryImpactMiniCard leagues={leagues} selectedLeagueId={selectedLeagueId} />
        <MatchupPrepMiniCard leagues={leagues} selectedLeagueId={selectedLeagueId} />
      </div>
    </section>
  )
}
