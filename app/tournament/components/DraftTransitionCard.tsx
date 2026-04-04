'use client'

import Link from 'next/link'

export function DraftTransitionCard({
  leagueName,
  conferenceName,
  draftTypeLabel,
  clockLabel,
  draftSlot,
  scheduledLabel,
  status,
  countdownLabel,
  leagueRoomHref,
  readOnly,
}: {
  leagueName: string
  conferenceName: string | null
  draftTypeLabel: string
  clockLabel: string
  draftSlot: number | null
  scheduledLabel: string
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETE' | string
  countdownLabel: string | null
  leagueRoomHref: string | null
  readOnly?: boolean
}) {
  const live = status === 'LIVE' || status === 'drafting'
  return (
    <div
      className={`rounded-xl border p-4 ${
        live ? 'border-[var(--tournament-active)]/50 bg-cyan-500/10' : 'border-[var(--tournament-border)] bg-[var(--tournament-panel)]'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[15px] font-bold text-white">{leagueName}</p>
          {conferenceName ? (
            <p className="text-[11px] text-[var(--tournament-text-dim)]">{conferenceName}</p>
          ) : null}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            live ? 'bg-red-500/25 text-red-200' : 'bg-white/10 text-white/70'
          }`}
        >
          {status}
        </span>
      </div>
      <p className="mt-2 text-[12px] text-[var(--tournament-text-mid)]">
        {draftTypeLabel} · {clockLabel}
      </p>
      <p className="text-[12px] text-white/90">
        You draft {draftSlot != null ? `${draftSlot}${nth(draftSlot)}` : '—'}
      </p>
      <p className="mt-1 text-[12px] text-[var(--tournament-text-dim)]">{scheduledLabel}</p>
      {countdownLabel ? (
        <p className="mt-2 font-mono text-[20px] font-bold tracking-tight text-[var(--tournament-gold)]">
          {countdownLabel}
        </p>
      ) : null}
      {leagueRoomHref && !readOnly ? (
        <Link
          href={leagueRoomHref}
          className={`mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl text-[14px] font-bold ${
            live ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'bg-white/10 text-white hover:bg-white/15'
          }`}
          data-testid="draft-enter-room"
        >
          {live ? 'Enter draft room' : 'Open league workspace'}
        </Link>
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

export function RoundResetExplainer({
  roundNumber,
  rosterBefore,
  rosterAfter,
  faabReset,
}: {
  roundNumber: number
  rosterBefore: number
  rosterAfter: number
  faabReset: boolean
}) {
  return (
    <div className="tournament-panel p-4">
      <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--tournament-text-dim)]">
        Round {roundNumber} draft — what&apos;s changing
      </p>
      <ul className="mt-3 space-y-2 text-[13px] text-[var(--tournament-text-mid)]">
        <li className="flex gap-2">
          <span>🔄</span>
          <span>
            <strong className="text-white">New draft</strong> — fresh roster, no carryover
          </span>
        </li>
        <li className="flex gap-2">
          <span>📋</span>
          <span>
            <strong className="text-white">Roster size</strong> — {rosterAfter} players (was {rosterBefore})
          </span>
        </li>
        <li className="flex gap-2">
          <span>💰</span>
          <span>
            <strong className="text-white">FAAB</strong> — {faabReset ? 'Reset to 100' : 'Carryover'}
          </span>
        </li>
        <li className="flex gap-2">
          <span>⚡</span>
          <span>
            <strong className="text-white">Draft order</strong> — randomized fresh
          </span>
        </li>
      </ul>
    </div>
  )
}
