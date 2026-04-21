'use client'

export function PlaceholderPanel({
  title,
  subtitle,
}: {
  title: string
  /** Short context for commissioner-grade tabs not fully wired in this surface yet. */
  subtitle?: string
}) {
  return (
    <div className="min-h-0 flex-1 px-6 py-8 text-[13px] text-white/45">
      <header className="mb-4 border-b border-white/[0.08] pb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {subtitle ? <p className="mt-1 text-[13px] text-white/50">{subtitle}</p> : null}
      </header>
      <p className="max-w-lg leading-relaxed text-white/45">
        This section is routed in the commissioner settings center. Extended controls and persistence will ship in follow-up
        patches; core league rules remain available under League, Roster, Scoring, Trade, Waiver, and Playoff tabs where
        wired.
      </p>
    </div>
  )
}
