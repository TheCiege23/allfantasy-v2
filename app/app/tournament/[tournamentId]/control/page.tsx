'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Trophy } from 'lucide-react'
import { TournamentControlDashboard } from '@/components/tournament'

export default function TournamentControlPage() {
  const params = useParams<{ tournamentId: string }>()
  const tournamentId = params?.tournamentId ?? ''

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link
          href="/app/tournament"
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" /> Tournaments
        </Link>
      </div>

      <header className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-4 sm:p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-950/30">
          <Trophy className="h-7 w-7 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Commissioner control</h1>
          <p className="text-sm text-white/60">Invite links and league list</p>
        </div>
      </header>

      {tournamentId && <TournamentControlDashboard tournamentId={tournamentId} />}
    </main>
  )
}
