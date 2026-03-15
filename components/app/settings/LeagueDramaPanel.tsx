'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, RefreshCw } from 'lucide-react'
import type { LeagueTabProps } from '@/components/app/tabs/types'

export default function LeagueDramaPanel({ leagueId }: LeagueTabProps) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ created: number; eventIds: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runEngine() {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/drama/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replace: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Failed to run')
        return
      }
      setResult({ created: data.created ?? 0, eventIds: data.eventIds ?? [] })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <h3 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
        <Zap className="h-4 w-4" />
        League drama engine
      </h3>
      <p className="mt-2 text-xs text-white/65">
        Generate storyline events (revenge games, upsets, rivalry clashes, streaks, playoff bubble, etc.) from matchups and rivalries. Storylines appear on the league Overview tab.
      </p>
      <div className="mt-4">
        <button
          type="button"
          onClick={runEngine}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/25 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Running…' : 'Run drama engine'}
        </button>
      </div>
      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
      {result && (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/80">
          Created {result.created} storyline event(s).
        </div>
      )}
    </section>
  )
}
