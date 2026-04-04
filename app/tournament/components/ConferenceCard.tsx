'use client'

import type { SerializedConference } from '@/lib/tournament/tournamentPageData'

export function ConferenceCard({
  conference,
  leagueCount,
  activeParticipants,
  advancersHint,
}: {
  conference: SerializedConference
  leagueCount: number
  activeParticipants: number
  advancersHint: string
}) {
  const initial = conference.name.slice(0, 1).toUpperCase()
  return (
    <div className="tournament-panel p-4">
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white"
          style={{
            background: conference.colorHex
              ? `linear-gradient(135deg, ${conference.colorHex}, #0c1220)`
              : 'linear-gradient(135deg, #3b82f6, #0c1220)',
          }}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold text-white">{conference.name}</h3>
          {conference.theme ? (
            <p className="text-[11px] text-[var(--tournament-text-dim)]">Theme: {conference.theme}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--tournament-text-mid)]">
            <span className="rounded-md bg-white/5 px-2 py-0.5">{leagueCount} leagues</span>
            <span className="rounded-md bg-white/5 px-2 py-0.5">{activeParticipants} competing</span>
          </div>
          <p className="mt-2 text-[11px] text-[var(--tournament-text-dim)]">{advancersHint}</p>
        </div>
      </div>
    </div>
  )
}
