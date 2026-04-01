import { ShieldCheck, SquarePen } from 'lucide-react'
import type { LeagueScoringSection } from '@/components/league/types'

export default function ScoreSettings({
  sections,
}: {
  sections: LeagueScoringSection[]
}) {
  return (
    <section className="rounded-2xl border border-[#1E2A42] bg-[#131929] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4.5 w-4.5 text-[#8B9DB8]" />
          <h2 className="text-[18px] font-semibold text-white">Scoring Settings</h2>
        </div>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#00D4AA]">
          <SquarePen className="h-3.5 w-3.5" />
          Edit
        </span>
      </div>
      <div className="mt-4 rounded-xl bg-[#1C2539] px-3 py-2 text-[13px] text-[#CBD5E1]">
        Non-standard scoring settings will be highlighted
      </div>
      <div className="mt-4 space-y-5">
        {sections.map((section) => (
          <div key={section.id}>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B9DB8]">
              {section.title}
            </div>
            <div className="overflow-hidden rounded-xl border border-[#1E2A42]">
              {section.rows.map((row) => (
                <div
                  key={row.id}
                  className={`flex items-center justify-between gap-3 px-3 py-3 text-[14px] ${row.isHighlighted ? 'bg-[#2D3A61]' : 'bg-transparent'} border-b border-white/5 last:border-b-0`}
                >
                  <span className="text-[#D9E3F0]">{row.label}</span>
                  <span className={row.isNegative ? 'text-[#EF4444]' : 'text-[#00D4AA]'}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
