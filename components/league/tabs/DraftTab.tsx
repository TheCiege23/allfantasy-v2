import StandingsRow from '@/components/league/StandingsRow'
import RosterSettingsCard from '@/components/league/RosterSettingsCard'
import ScoringSettingsCard from '@/components/league/ScoringSettingsCard'
import KeeperDeclarationCard from '@/components/league/KeeperDeclarationCard'
import WeeklyStoryline from '@/components/league/WeeklyStoryline'
import type {
  LeagueDraftSummaryCard,
  LeagueKeeperDeclarationItem,
  LeagueScoringSection,
  LeagueSettingsItem,
  LeagueStorylineCardData,
  LeagueTeamRow,
  LeagueVariantSummary,
} from '@/components/league/types'

export default function DraftTab({
  teams,
  season,
  settingsItems,
  scoringSections,
  variant,
  summaryCards,
  keeperDeclarations,
  draftRecap,
}: {
  teams: LeagueTeamRow[]
  season: number | null
  settingsItems: LeagueSettingsItem[]
  scoringSections: LeagueScoringSection[]
  variant: LeagueVariantSummary
  summaryCards: LeagueDraftSummaryCard[]
  keeperDeclarations: LeagueKeeperDeclarationItem[]
  draftRecap: LeagueStorylineCardData | null
}) {
  return (
    <div className="space-y-6">
      <WeeklyStoryline item={draftRecap} />
      {summaryCards.map((card) => (
        <section key={card.id} className="rounded-2xl border border-[#1E2A42] bg-[#131929] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[20px] font-semibold text-white">{card.title}</div>
              <div className="mt-1 text-[14px] text-[#8B9DB8]">{card.description}</div>
            </div>
            {variant.mode !== 'standard' ? (
              <div className="rounded-full border border-cyan-400/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                {variant.mode}
              </div>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {card.values.map((value) => (
              <div key={`${card.id}-${value.label}`} className="rounded-xl bg-[#0E1424] px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#8B9DB8]">{value.label}</div>
                <div className="mt-1 text-[16px] font-semibold text-white">{value.value}</div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="overflow-hidden rounded-2xl border border-[#1E2A42] bg-[#131929]">
        {teams.map((team) => (
          <StandingsRow key={team.id} row={team} showDraftPosition />
        ))}
      </section>

      <section className="flex items-center justify-between rounded-2xl border border-[#1E2A42] bg-[#131929] px-4 py-4">
        <div>
          <div className="text-[20px] font-semibold text-white">Previous Season</div>
          <div className="text-[14px] text-[#8B9DB8]">View your previous season</div>
        </div>
        <div className="rounded-full border border-[#00D4AA] px-6 py-2 text-[16px] font-semibold text-[#00D4AA]">
          {season ? season - 1 : '2025'}
        </div>
      </section>

      <RosterSettingsCard items={settingsItems} />
      <ScoringSettingsCard sections={scoringSections} />
      <KeeperDeclarationCard items={keeperDeclarations} />
    </div>
  )
}
