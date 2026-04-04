'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo } from 'react'
import { useTournamentUi } from '@/app/tournament/[tournamentId]/TournamentUiContext'

export default function TournamentHistoryPage() {
  const params = useParams()
  const tournamentId = params.tournamentId as string
  const base = `/tournament/${tournamentId}`
  const ctx = useTournamentUi()
  const { shell, rounds, participant } = ctx

  const hist = useMemo(() => {
    const h = participant?.advancementHistory
    if (Array.isArray(h)) return h as { round?: number; advanced?: boolean; pointsFor?: number }[]
    return []
  }, [participant?.advancementHistory])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="tournament-panel p-5">
        <h1 className="text-[18px] font-bold text-white">
          {shell.name} · {new Date().getFullYear()} · {shell.sport}
        </h1>
        {participant?.status === 'champion' ? (
          <p className="mt-3 text-[20px] font-bold text-[var(--tournament-gold)]">🏆 Champion</p>
        ) : null}
      </div>

      {rounds.map((r) => (
        <div key={r.id} className="tournament-panel p-4">
          <h2 className="text-[14px] font-bold text-cyan-100">
            Round {r.roundNumber}: {r.roundLabel}
          </h2>
          <p className="mt-1 text-[12px] text-[var(--tournament-text-dim)]">
            Weeks {r.weekStart}–{r.weekEnd} · {r.status}
          </p>
          <p className="mt-2 text-[12px] text-[var(--tournament-text-mid)]">
            Full round recap and elimination counts appear here as the season progresses.
          </p>
        </div>
      ))}

      {hist.length ? (
        <div className="tournament-panel p-4">
          <h2 className="text-[13px] font-bold text-white">Your advancement log</h2>
          <ul className="mt-2 space-y-2 text-[12px] text-[var(--tournament-text-mid)]">
            {hist.map((e, i) => (
              <li key={i} className="border-b border-white/5 pb-2">
                Round {String(e.round ?? '—')}: {e.advanced ? 'Advanced' : '—'} · PF {String(e.pointsFor ?? '—')}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Link href={`${base}/standings`} className="block text-center text-[13px] font-semibold text-cyan-300 hover:underline">
        View standings
      </Link>
    </div>
  )
}
