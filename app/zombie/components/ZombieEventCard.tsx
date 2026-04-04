'use client'

import clsx from 'clsx'

export type ZombieFeedEvent = {
  id: string
  kind: string
  title: string
  subtitle?: string
  week?: number | null
  leagueName?: string | null
}

const BORDER: Record<string, string> = {
  infection_event: 'border-l-[var(--zombie-purple)]',
  bashing_event: 'border-l-orange-500',
  mauling_event: 'border-l-[var(--zombie-red)] shadow-[var(--zombie-glow-red)]',
  revival_event: 'border-l-[var(--zombie-gold)]',
  weapon_event: 'border-l-white/20',
  serum_event: 'border-l-teal-500',
  ambush_event: 'border-l-[var(--zombie-crimson)]',
  whisperer_replaced: 'border-l-[var(--zombie-crimson)] animate-pulse',
  horde_milestone: 'border-l-[var(--zombie-purple)]',
  last_survivor: 'border-l-[var(--zombie-red)]',
  announcement: 'border-l-white/15',
  animation: 'border-l-sky-500/40',
}

export function ZombieEventCard({ event, compact }: { event: ZombieFeedEvent; compact?: boolean }) {
  const b = BORDER[event.kind] ?? BORDER.announcement
  return (
    <article
      className={clsx(
        'rounded-xl border border-[var(--zombie-border)] bg-[var(--zombie-panel)] py-2.5 pl-3 pr-3 border-l-4',
        b,
      )}
    >
      <p className="text-[13px] leading-snug text-[var(--zombie-text-full)]">{event.title}</p>
      {!compact && event.subtitle ? (
        <p className="mt-0.5 text-[11px] text-[var(--zombie-text-mid)]">{event.subtitle}</p>
      ) : null}
      <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-[var(--zombie-text-dim)]">
        {event.week != null ? <span>Week {event.week}</span> : null}
        {event.leagueName ? <span>{event.leagueName}</span> : null}
      </div>
    </article>
  )
}
