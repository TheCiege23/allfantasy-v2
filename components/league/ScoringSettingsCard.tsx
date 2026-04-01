import type { LeagueScoringSection } from '@/components/league/types'

export default function ScoringSettingsCard({
  sections,
}: {
  sections: LeagueScoringSection[]
}) {
  if (!sections.length) return null

  return (
    <section className="rounded-2xl border border-[#1E2A42] bg-[#131929] p-4">
      <div className="mb-3 text-[18px] font-semibold text-white">Scoring Settings</div>
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id}>
            <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-[#8B9DB8]">
              {section.title}
            </div>
            <div className="space-y-2">
              {section.rows.slice(0, 6).map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-xl bg-[#0E1424] px-3 py-2">
                  <span className="text-sm text-white/70">{row.label}</span>
                  <span className="text-sm font-semibold text-white">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
