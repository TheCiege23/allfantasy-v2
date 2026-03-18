'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Skull,
  MessageSquare,
  Settings,
  Sparkles,
  Zap,
  ChevronDown,
  Droplets,
  Swords,
  FileText,
  Crosshair,
} from 'lucide-react'
import type { ZombieSummary, ZombieView } from './types'
import { ZombieWhispererCard } from './ZombieWhispererCard'
import { ZombieSurvivorsList } from './ZombieSurvivorsList'
import { ZombieZombiesList } from './ZombieZombiesList'
import { ZombieWinningsSummary } from './ZombieWinningsSummary'
import { ZombieResourcesSummary } from './ZombieResourcesSummary'
import { ZombieChompinBlock } from './ZombieChompinBlock'
import { ZombieMovementOutlook } from './ZombieMovementOutlook'
import { ZombieWeeklyBoard } from './ZombieWeeklyBoard'
import { ZombieResourcesView } from './ZombieResourcesView'
import { ZombieAmbushBoard } from './ZombieAmbushBoard'
import { ZombieAIPanel } from './ZombieAIPanel'

const VIEW_LABELS: Record<ZombieView, string> = {
  home: 'Home',
  resources: 'Resources',
  ambush: 'Ambush & Matchups',
  'weekly-board': 'Weekly Board',
  ai: 'AI Tools',
}

export interface ZombieHomeProps {
  leagueId: string
}

export function ZombieHome({ leagueId }: ZombieHomeProps) {
  const [summary, setSummary] = useState<ZombieSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ZombieView>('home')
  const [week, setWeek] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/zombie/summary?week=${week}`,
        { cache: 'no-store' }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? `Error ${res.status}`)
        setSummary(null)
        return
      }
      const data = await res.json()
      setSummary(data)
    } catch {
      setError('Failed to load Zombie summary')
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [leagueId, week])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !summary) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-8">
        <p className="text-sm text-white/60">Loading Zombie League…</p>
      </div>
    )
  }

  if (error && !summary) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
        <p className="text-sm text-amber-200">{error}</p>
        <button type="button" onClick={() => load()} className="mt-2 text-xs text-cyan-400 hover:underline">
          Retry
        </button>
      </div>
    )
  }

  const names = summary?.rosterDisplayNames ?? {}

  return (
    <div className="space-y-6">
      {/* Zombie branding header */}
      <header className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-950/30 sm:h-20 sm:w-20">
          <Skull className="h-8 w-8 text-rose-400 sm:h-10 sm:w-10" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Zombie League</h1>
          <p className="text-sm text-white/60">
            Survivors · Whisperer · Infection · Serums & Weapons · Ambush
          </p>
        </div>
      </header>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/app/league/${leagueId}?tab=Chat`}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-950/50"
        >
          <MessageSquare className="h-4 w-4" /> League Chat
        </Link>
        <Link
          href={`/app/league/${leagueId}?tab=Settings`}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
        >
          <Settings className="h-4 w-4" /> Settings
        </Link>
        <Link
          href={`/app/league/${leagueId}?tab=Intelligence`}
          className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-2 text-sm text-rose-200 hover:bg-rose-950/50"
        >
          <Sparkles className="h-4 w-4" /> AI Tools
        </Link>
        <Link
          href={`/app/league/${leagueId}?tab=Waivers`}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
        >
          <Zap className="h-4 w-4" /> Waivers
        </Link>
        {summary?.myRosterId && (
          <Link
            href={`/app/zombie-universe`}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-2 text-sm text-amber-200 hover:bg-amber-950/50"
          >
            Universe Standings
          </Link>
        )}
      </div>

      {/* Week selector */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-white/50">Week</label>
        <select
          value={week}
          onChange={(e) => setWeek(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="rounded-xl border border-white/20 bg-white/5 py-2 pl-3 pr-8 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>

      {/* View switcher */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-white/50 sm:hidden">View:</span>
        <div className="relative sm:hidden">
          <select
            value={view}
            onChange={(e) => setView(e.target.value as ZombieView)}
            className="rounded-xl border border-white/20 bg-white/5 py-2 pl-3 pr-8 text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          >
            {(Object.keys(VIEW_LABELS) as ZombieView[]).map((v) => (
              <option key={v} value={v}>
                {VIEW_LABELS[v]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
        </div>
        <div className="hidden flex-wrap gap-1 sm:flex">
          {(Object.keys(VIEW_LABELS) as ZombieView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                view === v ? 'bg-rose-500/20 text-rose-200' : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {/* Panel content */}
      {view === 'home' && summary && (
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <ZombieWhispererCard
              whispererRosterId={summary.whispererRosterId}
              displayNames={names}
            />
            <ZombieResourcesSummary
              serums={summary.myResources?.serums}
              weapons={summary.myResources?.weapons}
              ambushCount={summary.myResources?.ambush}
            />
          </div>
          <ZombieSurvivorsList survivors={summary.survivors} displayNames={names} />
          <ZombieZombiesList zombies={summary.zombies} displayNames={names} />
          <ZombieWinningsSummary myRosterId={summary.myRosterId} />
          <ZombieChompinBlock candidates={[]} displayNames={names} week={summary.week} />
          <ZombieMovementOutlook movementWatch={summary.movementWatch} displayNames={names} />
          <ZombieWeeklyBoard leagueId={leagueId} week={summary.week} />
        </div>
      )}
      {view === 'resources' && summary && (
        <ZombieResourcesView
          serums={summary.myResources?.serums ?? 0}
          weapons={summary.myResources?.weapons ?? 0}
          ambushCount={summary.myResources?.ambush ?? 0}
          bombAvailable={false}
          serumReviveCount={summary.config.serumReviveCount}
          displayNames={names}
        />
      )}
      {view === 'ambush' && summary && (
        <ZombieAmbushBoard
          leagueId={leagueId}
          week={summary.week}
          matchups={[]}
          displayNames={names}
        />
      )}
      {view === 'weekly-board' && summary && (
        <ZombieWeeklyBoard leagueId={leagueId} week={summary.week} />
      )}
      {view === 'ai' && summary && (
        <ZombieAIPanel leagueId={leagueId} summary={summary} displayNames={names} />
      )}
    </div>
  )
}
