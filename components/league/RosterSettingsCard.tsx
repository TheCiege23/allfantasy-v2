import type { LeagueSettingsItem } from '@/components/league/types'

export default function RosterSettingsCard({
  items,
}: {
  items: LeagueSettingsItem[]
}) {
  if (!items.length) return null

  return (
    <section className="rounded-2xl border border-[#1E2A42] bg-[#131929] p-4">
      <div className="mb-3 text-[18px] font-semibold text-white">Roster Settings</div>
      <div className="grid gap-2">
        {items.slice(0, 10).map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-xl bg-[#0E1424] px-3 py-2">
            <span className="text-sm text-white/70">{item.label}</span>
            <span className="text-sm font-semibold text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
