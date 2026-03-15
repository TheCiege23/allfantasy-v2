'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  RefreshCw,
  Radio,
} from 'lucide-react'
import type { BroadcastPayload } from '@/lib/broadcast-engine/types'
import { LiveScoreRenderer } from '@/components/broadcast/LiveScoreRenderer'
import { StandingsTicker } from '@/components/broadcast/StandingsTicker'
import { StorylineOverlay } from '@/components/broadcast/StorylineOverlay'
import { RivalriesPanel } from '@/components/broadcast/RivalriesPanel'

const VIEWS = ['matchups', 'standings', 'storylines', 'rivalries'] as const
type ViewKey = (typeof VIEWS)[number]

export default function LeagueBroadcastPage() {
  const params = useParams<{ leagueId: string }>()
  const leagueId = params?.leagueId ?? ''

  const [payload, setPayload] = useState<BroadcastPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewIndex, setViewIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const view = VIEWS[viewIndex]

  const fetchPayload = useCallback(async () => {
    if (!leagueId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/broadcast/payload`,
        { cache: 'no-store' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Failed to load')
      setPayload(data)
      setLastRefresh(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    fetchPayload()
  }, [fetchPayload])

  useEffect(() => {
    const interval = setInterval(fetchPayload, 30_000)
    return () => clearInterval(interval)
  }, [fetchPayload])

  useEffect(() => {
    if (!isFullscreen) return
    const doc = document.documentElement
    try {
      doc.requestFullscreen?.()
    } catch {
      // ignore
    }
    return () => {
      try {
        if (document.fullscreenElement) document.exitFullscreen?.()
      } catch {
        // ignore
      }
    }
  }, [isFullscreen])

  const goPrev = () => setViewIndex((i) => (i === 0 ? VIEWS.length - 1 : i - 1))
  const goNext = () => setViewIndex((i) => (i === VIEWS.length - 1 ? 0 : i + 1))

  if (!leagueId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4">
        <p className="text-zinc-400">Missing league</p>
        <Link href="/app" className="mt-4 text-cyan-400 hover:underline">Go back</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Controls bar — visible when not fullscreen or on hover for accessibility */}
      <div className="fixed left-0 right-0 top-0 z-50 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-zinc-900/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-amber-400">
            <Radio className="h-4 w-4" /> Broadcast
          </span>
          <button
            type="button"
            onClick={() => setIsFullscreen((f) => !f)}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={fetchPayload}
            disabled={loading}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10"
            aria-label="Previous view"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[120px] text-center text-sm capitalize text-zinc-300">{view}</span>
          <button
            type="button"
            onClick={goNext}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10"
            aria-label="Next view"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <Link
          href={`/app/league/${encodeURIComponent(leagueId)}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-300 hover:bg-red-950/50"
        >
          <LogOut className="h-4 w-4" /> Exit broadcast
        </Link>
      </div>

      {/* Main content — padded for control bar */}
      <main className="pt-16 pb-8 px-4 md:px-8 lg:px-12">
        {error && (
          <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-red-300">
            {error}
            <button type="button" onClick={fetchPayload} className="ml-2 underline">Retry</button>
          </div>
        )}

        {loading && !payload && (
          <div className="flex min-h-[50vh] items-center justify-center">
            <p className="text-lg text-zinc-400">Loading broadcast data…</p>
          </div>
        )}

        {payload && !loading && (
          <div className="mx-auto max-w-6xl">
            {view === 'matchups' && (
              <LiveScoreRenderer
                matchups={payload.matchups}
                leagueName={payload.leagueName}
                sport={payload.sport}
                week={payload.currentWeek}
              />
            )}
            {view === 'standings' && (
              <StandingsTicker
                standings={payload.standings}
                leagueName={payload.leagueName}
                sport={payload.sport}
              />
            )}
            {view === 'storylines' && (
              <StorylineOverlay storylines={payload.storylines} title="Storylines" />
            )}
            {view === 'rivalries' && (
              <RivalriesPanel rivalries={payload.rivalries} title="Rivalries" />
            )}
          </div>
        )}

        {payload && (
          <p className="mt-4 text-center text-xs text-zinc-600">
            Last updated {lastRefresh?.toLocaleTimeString() ?? '—'} · Auto-refresh every 30s
          </p>
        )}
      </main>
    </div>
  )
}
