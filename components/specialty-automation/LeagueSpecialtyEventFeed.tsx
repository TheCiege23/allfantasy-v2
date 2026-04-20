'use client'

type FeedEvent = {
  id: string
  eventType: string
  title: string
  description: string | null
  createdAt: string
}

export default function LeagueSpecialtyEventFeed({ events }: { events: FeedEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-[13px] text-white/45">No league events yet. Scoring and specialty runs will post here.</p>
    )
  }

  return (
    <ul className="max-h-64 space-y-2 overflow-y-auto pr-1 text-[13px] text-white/85 [scrollbar-gutter:stable]">
      {events.map((e) => (
        <li
          key={e.id}
          className="rounded-lg border border-white/[0.06] bg-[#0a1228]/90 px-3 py-2"
          data-testid={`league-event-${e.eventType}`}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold text-cyan-200/90">{e.title}</span>
            <span className="shrink-0 text-[11px] text-white/35">
              {new Date(e.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
          {e.description ? <p className="mt-1 text-[12px] text-white/55">{e.description}</p> : null}
          <p className="mt-1 text-[11px] uppercase tracking-wide text-white/30">{e.eventType}</p>
        </li>
      ))}
    </ul>
  )
}
