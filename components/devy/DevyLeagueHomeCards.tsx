'use client'

/**
 * PROMPT 4: League Home cards — Devy Draft Countdown, Rookie Draft Countdown, Promotion Window,
 * Future Class Strength, Best Devy Stashes, Upcoming Graduates.
 */

import Link from 'next/link'

function Card({
  title,
  children,
  href,
}: {
  title: string
  children: React.ReactNode
  href?: string
}) {
  const wrap = href ? (
    <Link href={href} className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition">
      <h4 className="text-sm font-medium text-white/90">{title}</h4>
      {children}
    </Link>
  ) : (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-medium text-white/90">{title}</h4>
      {children}
    </div>
  )
  return wrap
}

interface DevyLeagueHomeCardsProps {
  leagueId: string
  devyDraftDate?: string | null
  rookieDraftDate?: string | null
  promotionWindowOpen?: boolean
  promotionEligibleCount?: number
  classStrengthByYear?: Record<number, number>
  bestStashes?: Array<{ name: string; position: string; school: string }>
  upcomingGraduates?: Array<{ name: string; position: string; draftEligibleYear?: number }>
}

export function DevyLeagueHomeCards({
  leagueId,
  devyDraftDate,
  rookieDraftDate,
  promotionWindowOpen,
  promotionEligibleCount = 0,
  classStrengthByYear = {},
  bestStashes = [],
  upcomingGraduates = [],
}: DevyLeagueHomeCardsProps) {
  const years = Object.keys(classStrengthByYear).map(Number).sort((a, b) => a - b)

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Card title="Devy Draft Countdown" href={`/app/league/${leagueId}?tab=Draft`}>
        <p className="mt-2 text-xs text-white/70">
          {devyDraftDate ? `Scheduled: ${devyDraftDate}` : 'Date TBD'}
        </p>
      </Card>
      <Card title="Rookie Draft Countdown" href={`/app/league/${leagueId}?tab=Draft`}>
        <p className="mt-2 text-xs text-white/70">
          {rookieDraftDate ? `Scheduled: ${rookieDraftDate}` : 'Date TBD'}
        </p>
      </Card>
      <Card title="Promotion Window" href={`/app/league/${leagueId}`}>
        <p className="mt-2 text-xs text-white/70">
          {promotionWindowOpen ? 'Open' : 'Closed'}
          {promotionEligibleCount > 0 && ` · ${promotionEligibleCount} eligible`}
        </p>
      </Card>
      <Card title="Future Class Strength">
        {years.length === 0 ? (
          <p className="mt-2 text-xs text-white/50">No data</p>
        ) : (
          <ul className="mt-2 space-y-1 text-xs text-white/70">
            {years.slice(0, 4).map((y) => (
              <li key={y}>{y}: {classStrengthByYear[y]} prospects</li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Best Devy Stashes">
        {bestStashes.length === 0 ? (
          <p className="mt-2 text-xs text-white/50">—</p>
        ) : (
          <ul className="mt-2 space-y-1 text-xs text-white/70">
            {bestStashes.slice(0, 5).map((s, i) => (
              <li key={i}>{s.name} ({s.position}, {s.school})</li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Upcoming Graduates">
        {upcomingGraduates.length === 0 ? (
          <p className="mt-2 text-xs text-white/50">—</p>
        ) : (
          <ul className="mt-2 space-y-1 text-xs text-white/70">
            {upcomingGraduates.slice(0, 5).map((g, i) => (
              <li key={i}>{g.name} ({g.position}){g.draftEligibleYear != null ? ` · ${g.draftEligibleYear}` : ''}</li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
