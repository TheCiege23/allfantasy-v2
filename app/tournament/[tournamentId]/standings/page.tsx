'use client'

import { useMemo, useState } from 'react'
import { useTournamentUi } from '@/app/tournament/[tournamentId]/TournamentUiContext'
import { useTournamentParticipantState } from '@/lib/tournament/useTournamentParticipantState'
import { StandingsRow } from '@/app/tournament/components/StandingsRow'

type Tab = 'league' | 'conference' | 'global' | 'weekly'

export default function TournamentStandingsHubPage() {
  const ctx = useTournamentUi()
  const state = useTournamentParticipantState(ctx)
  const [tab, setTab] = useState<Tab>('league')
  const [q, setQ] = useState('')

  const conference = useMemo(
    () => ctx.conferences.find((c) => c.id === ctx.participant?.currentConferenceId) ?? ctx.conferences[0],
    [ctx.conferences, ctx.participant?.currentConferenceId],
  )

  const myLeague = useMemo(() => {
    if (!state.myStandingsRow) return null
    return state.standingsLeagues.find((l) => l.id === state.myStandingsRow?.tournamentLeagueId) ?? null
  }, [state.myStandingsRow, state.standingsLeagues])

  const conferenceRows = useMemo(() => {
    if (!conference) return []
    return state.standingsLeagues
      .filter((L) => L.conferenceId === conference.id)
      .flatMap((L) => L.participants.map((p) => ({ ...p, _league: L.name })))
      .sort((a, b) => (a.conferenceRank ?? 999) - (b.conferenceRank ?? 999))
  }, [conference, state.standingsLeagues])

  const globalRows = useMemo(() => {
    const rows = state.standingsLeagues.flatMap((L) =>
      L.participants.map((p) => ({ ...p, _league: L.name, _conf: L.conferenceId })),
    )
    rows.sort((a, b) => b.pointsFor - a.pointsFor)
    return rows
  }, [state.standingsLeagues])

  const filterQ = (name: string) => !q.trim() || name.toLowerCase().includes(q.trim().toLowerCase())

  const tabs: { id: Tab; label: string }[] = [
    { id: 'league', label: 'My League' },
    { id: 'conference', label: 'Conference' },
    { id: 'global', label: 'Global' },
    { id: 'weekly', label: 'Weekly' },
  ]

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-[18px] font-bold text-white">Standings</h1>
      <div className="scrollbar-none flex gap-1 overflow-x-auto border-b border-[var(--tournament-border)] pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-lg px-4 py-2 text-[12px] font-bold ${
              tab === t.id ? 'bg-cyan-500/20 text-cyan-100' : 'text-[var(--tournament-text-mid)] hover:bg-white/5'
            }`}
            data-testid={`standings-tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search team…"
        className="w-full rounded-xl border border-[var(--tournament-border)] bg-black/25 px-3 py-2 text-[13px] text-white placeholder:text-white/35 md:max-w-sm"
      />

      {tab === 'league' && myLeague ? (
        <div className="tournament-panel overflow-x-auto p-2">
          <table className="w-full min-w-[560px]">
            <tbody>
              {myLeague.participants
                .filter((r) => filterQ(r.participant.displayName))
                .sort((a, b) => (a.leagueRank ?? 99) - (b.leagueRank ?? 99))
                .map((row, idx) => (
                  <StandingsRow
                    key={row.id}
                    row={row}
                    rank={row.leagueRank ?? idx + 1}
                    highlight={row.userId === ctx.viewerUserId}
                    hidePf={false}
                  />
                ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'conference' ? (
        <div className="tournament-panel overflow-x-auto p-2">
          <table className="w-full min-w-[560px]">
            <tbody>
              {conferenceRows
                .filter((r) => filterQ(r.participant.displayName))
                .map((row, idx) => (
                  <StandingsRow
                    key={row.id}
                    row={row}
                    rank={row.conferenceRank ?? idx + 1}
                    highlight={row.userId === ctx.viewerUserId}
                    hidePf={false}
                  />
                ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'global' ? (
        <div className="tournament-panel overflow-x-auto p-2">
          <table className="w-full min-w-[560px]">
            <tbody>
              {globalRows
                .filter((r) => filterQ(r.participant.displayName))
                .map((row, idx) => (
                  <StandingsRow
                    key={`${row.id}-g`}
                    row={row}
                    rank={idx + 1}
                    highlight={row.userId === ctx.viewerUserId}
                    hidePf={false}
                  />
                ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'weekly' ? (
        <div className="tournament-panel p-4 text-[13px] text-[var(--tournament-text-mid)]">
          Weekly high scores sync with redraft weekly scoring. Use your league workspace Scores tab for week-by-week
          detail until this hub pulls week slices from the API.
        </div>
      ) : null}

      {state.standingsError ? (
        <p className="text-[12px] text-red-300">{state.standingsError}</p>
      ) : null}
    </div>
  )
}
