'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Skull, BarChart3, MessageSquare, Sparkles, ChevronLeft } from 'lucide-react'
import { ZombieUniverseStandingsClient } from '@/components/zombie/ZombieUniverseStandingsClient'
import { ZombieUniverseForumClient } from '@/components/zombie/ZombieUniverseForumClient'
import { ZombieUniverseAIPanel } from '@/components/zombie/ZombieUniverseAIPanel'

export default function ZombieUniverseHomePage() {
  const params = useParams<{ universeId: string }>()
  const universeId = params?.universeId ?? ''
  const [tab, setTab] = useState<'standings' | 'forum' | 'ai'>('standings')

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link
          href="/app/zombie-universe"
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" /> Universes
        </Link>
      </div>

      <header className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-950/30">
          <Skull className="h-7 w-7 text-rose-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Zombie Universe</h1>
          <p className="text-sm text-white/60">Standings and forum</p>
        </div>
      </header>

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('standings')}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
            tab === 'standings'
              ? 'border-rose-500/40 bg-rose-950/30 text-rose-200'
              : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <BarChart3 className="h-4 w-4" /> Standings
        </button>
        <button
          type="button"
          onClick={() => setTab('forum')}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
            tab === 'forum'
              ? 'border-rose-500/40 bg-rose-950/30 text-rose-200'
              : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <MessageSquare className="h-4 w-4" /> Forum
        </button>
        <button
          type="button"
          onClick={() => setTab('ai')}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
            tab === 'ai'
              ? 'border-rose-500/40 bg-rose-950/30 text-rose-200'
              : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <Sparkles className="h-4 w-4" /> AI
        </button>
      </div>

      {tab === 'standings' && universeId && (
        <ZombieUniverseStandingsClient universeId={universeId} />
      )}
      {tab === 'forum' && universeId && (
        <ZombieUniverseForumClient universeId={universeId} />
      )}
      {tab === 'ai' && universeId && (
        <ZombieUniverseAIPanel universeId={universeId} />
      )}

      <div className="mt-4 flex gap-2">
        <Link
          href={`/app/zombie-universe/${encodeURIComponent(universeId)}/standings`}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          Open Standings full page
        </Link>
        <Link
          href={`/app/zombie-universe/${encodeURIComponent(universeId)}/forum`}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          Open Forum full page
        </Link>
      </div>
    </main>
  )
}
