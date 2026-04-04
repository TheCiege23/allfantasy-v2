'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useTournamentUi } from '@/app/tournament/[tournamentId]/TournamentUiContext'
import { useTournamentParticipantState } from '@/lib/tournament/useTournamentParticipantState'
import { AdvancementOverlay, EliminationOverlay } from '@/app/tournament/components/AdvancementCard'
import { TournamentStatusCard } from '@/app/tournament/components/TournamentStatusCard'
import { LeagueIdentityCard } from '@/app/tournament/components/LeagueIdentityCard'
import { RoundProgressBar } from '@/app/tournament/components/RoundProgressBar'
import { ForumPostCard } from '@/app/tournament/components/ForumPostCard'

function useCountdown(target: Date | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!target || target.getTime() <= now) return null
  const s = Math.floor((target.getTime() - now) / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${d}d ${h}h ${m}m ${sec}s`
}

export default function TournamentHomePage() {
  const params = useParams()
  const tournamentId = params.tournamentId as string
  const base = `/tournament/${tournamentId}`
  const ctx = useTournamentUi()
  const { shell, conferences, announcements, participant, viewerUserId } = ctx
  const state = useTournamentParticipantState(ctx)

  const conference = useMemo(
    () => conferences.find((c) => c.id === participant?.currentConferenceId) ?? null,
    [conferences, participant?.currentConferenceId],
  )

  const currentRoundMeta = useMemo(
    () => ctx.rounds.find((r) => r.roundNumber === (state.standingsRound?.roundNumber ?? shell.currentRoundNumber)),
    [ctx.rounds, state.standingsRound?.roundNumber, shell.currentRoundNumber],
  )

  const tlFromCtx = useMemo(() => {
    if (!participant?.currentLeagueId) return null
    return ctx.tournamentLeagues.find((l) => l.id === participant.currentLeagueId) ?? null
  }, [ctx.tournamentLeagues, participant?.currentLeagueId])

  const countdownDraft = useCountdown(state.nextDraftAt)
  const within24h =
    state.nextDraftAt && state.nextDraftAt.getTime() - Date.now() < 86400000 && state.nextDraftAt.getTime() > Date.now()

  const isWildcard = state.myStandingsRow?.advancementStatus === 'wildcard_eligible'

  const [elimOpen, setElimOpen] = useState(false)
  useEffect(() => {
    if (state.status !== 'eliminated') return
    try {
      const seen = localStorage.getItem(`tournament-elim-seen-${shell.id}`) === '1'
      setElimOpen(!seen)
    } catch {
      setElimOpen(true)
    }
  }, [state.status, shell.id])

  const dismissElim = () => {
    try {
      localStorage.setItem(`tournament-elim-seen-${shell.id}`, '1')
    } catch {
      /* ignore */
    }
    setElimOpen(false)
  }

  const showAdvanceOverlay = state.status === 'advanced' && !state.hasSeenAdvancement && participant && tlFromCtx

  const conferenceRows = useMemo(() => {
    if (!conference) return []
    const rows = state.standingsLeagues
      .filter((L) => L.conferenceId === conference.id)
      .flatMap((L) => L.participants)
    rows.sort((a, b) => b.pointsFor - a.pointsFor || b.wins - a.wins)
    return rows.slice(0, 8)
  }, [conference, state.standingsLeagues])

  const top5 = conferenceRows.slice(0, 5)

  const globalBoard = useMemo(() => {
    const rows = state.standingsLeagues.flatMap((L) => L.participants)
    rows.sort((a, b) => b.pointsFor - a.pointsFor)
    const idx = viewerUserId ? rows.findIndex((r) => r.userId === viewerUserId) : -1
    return { rows, idx, total: rows.length }
  }, [state.standingsLeagues, viewerUserId])

  const percentile = globalBoard.idx >= 0 && globalBoard.total > 0
    ? Math.round((1 - globalBoard.idx / globalBoard.total) * 100)
    : null

  const latest = announcements[0]

  const adv = shell.advancersPerLeague
  const bubbleN = shell.bubbleEnabled ? Math.min(shell.bubbleSize, 8) : 0

  const remainingByRound: Record<number, number> = {}
  for (const r of ctx.rounds) {
    const tls = ctx.tournamentLeagues.filter((l) => l.roundId === r.id)
    const n = tls.reduce((acc, l) => acc + l.currentTeamCount, 0)
    remainingByRound[r.roundNumber] = n || shell.currentParticipantCount
  }

  const isFinals = currentRoundMeta?.roundType === 'championship'

  return (
    <div className={`mx-auto max-w-3xl space-y-4 md:max-w-4xl ${isFinals ? 'rounded-2xl ring-1 ring-yellow-500/20' : ''}`}>
      {shell.status === 'bubble' ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-center text-[13px] font-bold text-amber-100">
          ⚠ BUBBLE WEEK — scores lock after this window
        </div>
      ) : null}

      {within24h && state.nextDraftAt ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-[12px] text-amber-50">
          ⚡ Draft soon — {tlFromCtx?.name ?? 'Your league'} · {state.nextDraftAt.toLocaleString()}
          <Link href={`${base}/drafts`} className="ml-2 font-bold underline">
            Drafts
          </Link>
        </div>
      ) : null}

      {state.status === 'advanced' && state.hasSeenAdvancement && tlFromCtx ? (
        <div className="rounded-xl border border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-transparent p-4 shadow-[0_0_24px_rgba(245,184,0,0.12)]">
          <p className="text-[11px] font-bold uppercase tracking-widest text-yellow-200/90">⚡ New league assigned</p>
          <p className="mt-1 text-[18px] font-bold text-white">{tlFromCtx.name}</p>
          <p className="mt-2 text-[12px] text-[var(--tournament-text-mid)]">
            You&apos;re already in — open the league workspace for draft & lineups.
          </p>
          <Link
            href={tlFromCtx.leagueId ? `/league/${tlFromCtx.leagueId}` : `${base}/league`}
            className="mt-3 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-yellow-500/90 px-4 text-[14px] font-bold text-black hover:bg-yellow-400"
          >
            Go to my new league
          </Link>
        </div>
      ) : null}

      <div
        className={`overflow-hidden rounded-2xl border border-[var(--tournament-border)] bg-gradient-to-r from-[#0a1520] via-[#0c1220] to-[#121028] p-4 md:flex md:items-center md:justify-between md:p-5 ${
          isFinals ? 'from-yellow-900/20' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20 text-2xl">🏆</div>
          <div>
            <h1 className="text-[18px] font-black text-white md:text-[22px]">{shell.name}</h1>
            <p className="text-[11px] text-[var(--tournament-text-dim)]">{shell.sport}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col items-stretch gap-2 md:mt-0 md:items-end">
          <span className="self-start rounded-full bg-white/10 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-cyan-200 md:self-end">
            {currentRoundMeta?.roundLabel ?? `Round ${shell.currentRoundNumber || 1}`}
          </span>
          <p className="text-[12px] text-[var(--tournament-text-mid)]">
            <span className="font-mono text-white">{shell.currentParticipantCount}</span> participants · max{' '}
            {shell.maxParticipants}
          </p>
        </div>
      </div>

      {state.standingsError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[12px] text-red-200">
          {state.standingsError}
        </div>
      ) : null}

      {participant ? (
        <TournamentStatusCard
          status={state.status}
          conference={conference}
          league={tlFromCtx}
          shellName={shell.name}
          currentRound={state.currentRound}
          totalRounds={shell.totalRounds}
          recordW={state.myStandingsRow?.wins ?? participant.careerWins}
          recordL={state.myStandingsRow?.losses ?? participant.careerLosses}
          pointsFor={state.myStandingsRow?.pointsFor ?? participant.careerPointsFor}
          conferenceRank={state.conferenceRank}
          basePath={base}
          nextDraftAt={state.nextDraftAt}
          isDraftLive={state.isDraftLive}
          isWildcardAdvance={isWildcard}
        />
      ) : (
        <div className="tournament-panel p-4 text-[13px] text-[var(--tournament-text-mid)]">
          You&apos;re viewing this tournament hub. Register from the commissioner flow when open.
        </div>
      )}

      <div className="rounded-xl border border-orange-500/35 bg-[#0c1219] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-100">
            {state.isDraftLive ? 'DRAFT / MATCHUP' : 'NEXT EVENT'}
          </span>
        </div>
        {countdownDraft ? (
          <p className="mt-2 font-mono text-[26px] font-bold tracking-tight text-[var(--tournament-gold)]">
            {countdownDraft}
          </p>
        ) : (
          <p className="mt-2 text-[14px] text-[var(--tournament-text-mid)]">Schedule updates as rounds progress</p>
        )}
        <p className="mt-1 text-[12px] text-[var(--tournament-text-dim)]">
          {currentRoundMeta
            ? `Weeks ${currentRoundMeta.weekStart}–${currentRoundMeta.weekEnd} · ${currentRoundMeta.roundLabel}`
            : 'Season clock from commissioner setup'}
        </p>
        {tlFromCtx?.leagueId ? (
          <Link
            href={`/league/${tlFromCtx.leagueId}`}
            className="mt-3 inline-block text-[13px] font-semibold text-[var(--tournament-active)] hover:underline"
          >
            Go to draft room →
          </Link>
        ) : null}
      </div>

      {tlFromCtx && conference ? (
        <LeagueIdentityCard
          name={tlFromCtx.name}
          conference={conference}
          roundLabel={currentRoundMeta?.roundLabel ?? 'Round'}
          teamSlots={tlFromCtx.teamSlots}
          currentCount={tlFromCtx.currentTeamCount}
          status={tlFromCtx.status}
          leagueId={tlFromCtx.id}
          href={tlFromCtx.leagueId ? `/league/${tlFromCtx.leagueId}` : `${base}/league`}
          leagueIndex={0}
        />
      ) : null}

      {conference && top5.length ? (
        <div className="tournament-panel overflow-x-auto p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[13px] font-bold text-white">Conference race</h2>
            <span className="text-[10px] text-[var(--tournament-text-dim)]">{conference.name}</span>
          </div>
          <ul className="space-y-2">
            {top5.map((row, i) => (
              <li
                key={row.id}
                className={`flex items-center gap-3 rounded-lg border border-[var(--tournament-border)] px-3 py-2 text-[12px] ${
                  row.userId === viewerUserId ? 'bg-yellow-500/10' : 'bg-black/20'
                }`}
                style={
                  row.userId === viewerUserId
                    ? { boxShadow: 'inset 3px 0 0 0 var(--tournament-gold)' }
                    : undefined
                }
              >
                <span className="w-6 font-mono font-bold text-white">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-white">{row.participant.displayName}</span>
                <span className="text-[var(--tournament-text-mid)]">
                  {row.wins}-{row.losses}
                </span>
                <span className="font-semibold text-white">{row.pointsFor.toFixed(1)}</span>
                <span className="hidden text-[10px] uppercase text-[var(--tournament-text-dim)] sm:inline">
                  {row.advancementStatus.replace('_', ' ')}
                </span>
              </li>
            ))}
          </ul>
          {adv > 0 ? (
            <div className="mt-3 border-t border-dashed border-[var(--tournament-gold)]/50 pt-2 text-center text-[10px] font-bold uppercase tracking-wide text-[var(--tournament-gold)]">
              — QUALIFICATION LINE — Top {adv} advance —
            </div>
          ) : null}
          {bubbleN > 0 ? (
            <div className="mt-2 border-t border-dashed border-amber-500/50 pt-2 text-center text-[10px] font-bold uppercase tracking-wide text-amber-200">
              — BUBBLE ZONE — Next {bubbleN} —
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="tournament-panel p-4">
        <h2 className="text-[13px] font-bold text-white">Global snapshot</h2>
        {globalBoard.idx >= 0 ? (
          <>
            <p className="mt-2 text-[15px] text-white">
              You rank <strong>#{globalBoard.idx + 1}</strong> of {globalBoard.total} by points for
            </p>
            {percentile != null ? (
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-yellow-400"
                  style={{ width: `${Math.min(100, percentile)}%` }}
                />
              </div>
            ) : null}
            <p className="mt-2 text-[11px] text-[var(--tournament-text-dim)]">
              Top 10% / 25% markers are illustrative — tiebreakers follow commissioner rules.
            </p>
          </>
        ) : (
          <p className="mt-2 text-[12px] text-[var(--tournament-text-dim)]">Join a league to appear on the board.</p>
        )}
      </div>

      <RoundProgressBar
        rounds={ctx.rounds}
        currentRoundNumber={shell.currentRoundNumber || 1}
        remainingByRound={remainingByRound}
      />

      {latest ? (
        <div>
          <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--tournament-text-dim)]">
            Latest announcement
          </h2>
          <ForumPostCard
            type={latest.type}
            title={latest.title}
            content={latest.content}
            createdAt={latest.createdAt}
            readOnly={state.status === 'eliminated'}
          />
          <Link href={`${base}/forum`} className="mt-2 inline-block text-[12px] font-semibold text-cyan-300 hover:underline">
            Open forum →
          </Link>
        </div>
      ) : null}

      {showAdvanceOverlay && participant && tlFromCtx ? (
        <AdvancementOverlay
          open
          variant={isWildcard ? 'wildcard' : 'qualified'}
          fromRound={state.currentRound - 1 > 0 ? state.currentRound - 1 : 1}
          toRound={state.currentRound}
          record={`${state.myStandingsRow?.wins ?? 0}-${state.myStandingsRow?.losses ?? 0}`}
          conferenceRank={state.conferenceRank ? `${state.conferenceRank}${nth(state.conferenceRank)}` : '—'}
          conferenceName={conference?.name ?? 'Conference'}
          newLeagueName={tlFromCtx.name}
          draftAt={tlFromCtx.draftScheduledAt ? new Date(tlFromCtx.draftScheduledAt).toLocaleString() : null}
          basePath={base}
          onDismiss={state.markAdvancementSeen}
        />
      ) : null}

      {elimOpen ? (
        <EliminationOverlay
          open
          round={state.currentRound}
          record={`${participant?.careerWins ?? 0}-${participant?.careerLosses ?? 0}`}
          pointsFor={participant?.careerPointsFor ?? 0}
          basePath={base}
          onDismiss={dismissElim}
        />
      ) : null}
    </div>
  )
}

function nth(n: number): string {
  const m = n % 10
  const m100 = n % 100
  if (m100 >= 11 && m100 <= 13) return 'th'
  if (m === 1) return 'st'
  if (m === 2) return 'nd'
  if (m === 3) return 'rd'
  return 'th'
}
