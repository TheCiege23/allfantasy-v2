import CollegePlayerRow from '@/components/league/CollegePlayerRow'
import type { LeagueRosterSection } from '@/components/league/types'

export default function C2CRosterSection({ section }: { section: LeagueRosterSection }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[24px] font-semibold text-white">{section.title}</h2>
      </div>
      <div className="space-y-1">
        {section.items.length === 0 ? (
          <div className="rounded-2xl border border-[#1E2A42] bg-[#131929] px-4 py-4 text-[14px] text-[#8B9DB8]">
            {section.emptyLabel}
          </div>
        ) : (
          section.items.map((item) => (
            <div key={item.id} className="rounded-xl bg-transparent">
              <CollegePlayerRow slot={item} />
            </div>
          ))
        )}
      </div>
    </section>
  )
}
