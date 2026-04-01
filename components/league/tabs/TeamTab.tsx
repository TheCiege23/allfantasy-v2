import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowUpRight, Newspaper, Repeat2, Rows3 } from 'lucide-react'
import PlayerHeadshot from '@/components/league/PlayerHeadshot'
import PlayerRow from '@/components/league/PlayerRow'
import DevyRosterSection from '@/components/league/DevyRosterSection'
import C2CRosterSection from '@/components/league/C2CRosterSection'
import type { LeagueRosterCard, LeagueVariantSummary } from '@/components/league/types'

function ActionLink({
  href,
  label,
  icon,
  badge,
}: {
  href: string
  label: string
  icon: ReactNode
  badge?: number | null
}) {
  return (
    <Link href={href} className="flex min-h-[44px] items-center justify-center gap-2 text-[15px] font-semibold text-[#CBD5E1]">
      {icon}
      <span>{label}</span>
      {badge ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[11px] font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  )
}

export default function TeamTab({
  leagueId,
  roster,
  variant,
}: {
  leagueId: string
  roster: LeagueRosterCard
  variant: LeagueVariantSummary
}) {
  return (
    <div className="space-y-5">
      {roster.overRosterLimitBy > 0 ? (
        <section className="rounded-2xl bg-[#3D0F0F] px-4 py-4 text-[15px] font-medium text-[#EF4444]">
          You are {roster.overRosterLimitBy} player{roster.overRosterLimitBy === 1 ? '' : 's'} over the roster limit. Please cut some players from your roster.
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-[#1E2A42] bg-[#131929]">
        <div className="flex items-center gap-3 px-4 py-4">
          <PlayerHeadshot src={roster.avatarUrl} alt={roster.teamName} size={56} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[28px] font-semibold text-white">{roster.teamName || 'Free'}</div>
            <div className="text-[15px] text-[#8B9DB8]">
              {roster.record.wins}-{roster.record.losses}
              {roster.record.ties ? `-${roster.record.ties}` : ''}
              {roster.ownerName ? ` • ${roster.ownerName}` : ''}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10">
          <ActionLink href={`/app/league/${leagueId}?tab=PLAYERS&playersTab=trade`} label="Trade" icon={<Repeat2 className="h-4 w-4" />} badge={1} />
          <ActionLink href={`/app/league/${leagueId}?tab=LEAGUE`} label="Trans." icon={<Rows3 className="h-4 w-4" />} />
          <ActionLink href={`/app/league/${leagueId}?tab=LEAGUE`} label="News" icon={<Newspaper className="h-4 w-4" />} />
        </div>
      </section>

      <Link
        href={`/messages?leagueId=${leagueId}`}
        className="flex min-h-[48px] items-center justify-between rounded-2xl border border-[#00D4AA]/30 bg-[#0F3D35] px-4 py-3 text-[15px] font-semibold text-[#00D4AA]"
      >
        <span>✦ Ask Chimmy about your lineup</span>
        <ArrowUpRight className="h-4 w-4" />
      </Link>

      {roster.sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[24px] font-semibold text-white">{section.title}</h2>
            {section.id === 'starters' ? <ArrowUpRight className="h-4.5 w-4.5 text-[#8B9DB8]" /> : null}
          </div>
          <div className="space-y-1">
            {section.items.length === 0 ? (
              <div className="rounded-2xl border border-[#1E2A42] bg-[#131929] px-4 py-4 text-[14px] text-[#8B9DB8]">
                {section.emptyLabel}
              </div>
            ) : (
              section.items.map((item) => (
                <div key={item.id} className="rounded-xl bg-transparent">
                  <PlayerRow slot={item} />
                </div>
              ))
            )}
          </div>
        </section>
      ))}

      {variant.mode === 'devy'
        ? roster.collegeSections?.map((section) => <DevyRosterSection key={section.id} section={section} />)
        : null}

      {variant.mode === 'c2c'
        ? roster.collegeSections?.map((section) => <C2CRosterSection key={section.id} section={section} />)
        : null}

      <section className="space-y-3">
        <h2 className="text-[24px] font-semibold text-white">Draft Picks</h2>
        <div className="rounded-2xl border border-[#1E2A42] bg-[#131929] p-4">
          {roster.draftPicks.length === 0 ? (
            <div className="text-[14px] text-[#8B9DB8]">No future picks loaded for this roster yet.</div>
          ) : (
            <div className="space-y-2">
              {roster.draftPicks.map((pick, index) => (
                <div key={`${pick}-${index}`} className="text-[15px] text-white">
                  {pick}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
