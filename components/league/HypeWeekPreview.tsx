import type { LeagueMatchupPreviewCardData } from '@/components/league/types'

export default function HypeWeekPreview({
  item,
}: {
  item: LeagueMatchupPreviewCardData | null
}) {
  if (!item) return null

  return (
    <section className="rounded-2xl border border-[#1E2A42] bg-[#131929] p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-amber-200">Hype Preview</div>
      <div className="mt-2 text-[18px] font-semibold text-white">{item.headline}</div>
      <div className="mt-2 text-sm text-white/70">{item.summary}</div>
      {item.confidenceLabel ? (
        <div className="mt-3 text-xs text-white/45">{item.confidenceLabel}</div>
      ) : null}
    </section>
  )
}
