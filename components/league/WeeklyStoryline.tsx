import type { LeagueStorylineCardData } from '@/components/league/types'

export default function WeeklyStoryline({
  item,
}: {
  item: LeagueStorylineCardData | null
}) {
  if (!item) return null

  return (
    <section className="rounded-2xl border border-[#1E2A42] bg-[#131929] p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-cyan-200">Weekly Storyline</div>
      <div className="mt-2 text-[18px] font-semibold text-white">{item.title}</div>
      <div className="mt-2 text-sm text-white/70">{item.summary}</div>
      {item.body ? <div className="mt-3 text-sm text-white/55">{item.body}</div> : null}
      <div className="mt-3 text-xs text-white/45">{item.createdAtLabel}</div>
    </section>
  )
}
