'use client'

import { Coins } from 'lucide-react'

export function FutureCapitalPanel({
  summary,
  picksByYear,
}: {
  summary: string
  picksByYear: Record<string, string[]>
}) {
  const years = Object.keys(picksByYear).sort()

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.06] to-[#070d18] p-5 md:p-6">
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-amber-200/90" aria-hidden />
        <h2 className="text-sm font-bold text-white">Future picks & capital</h2>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-amber-100/85">{summary}</p>
      {years.length === 0 ? (
        <p className="mt-4 text-[12px] text-white/45">No draft picks parsed yet — re-sync imports if picks should show.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {years.map((y) => (
            <div key={y} className="rounded-xl border border-white/[0.07] bg-black/30 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">{y}</p>
              <ul className="mt-2 space-y-1 text-[12px] text-white/75">
                {picksByYear[y]!.map((line, i) => (
                  <li key={i} className="leading-snug">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
