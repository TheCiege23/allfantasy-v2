'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, RefreshCw } from 'lucide-react'
import type { LeagueTabProps } from '@/components/app/tabs/types'

export default function BehaviorProfilesPanel({ leagueId }: LeagueTabProps) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{
    total: number
    success: number
    failed: number
    results: Array<{ managerId: string; teamName?: string; ok: boolean; error?: string }>
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function buildAll() {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/psychological-profiles/run-all`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Failed to run')
        return
      }
      setResult({
        total: data.total ?? 0,
        success: data.success ?? 0,
        failed: data.failed ?? 0,
        results: Array.isArray(data.results) ? data.results : [],
      })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <Brain className="h-4 w-4 text-purple-400" />
        Behavior Profiles
      </h3>
      <p className="mt-2 text-xs text-white/65">
        Generate psychological profiles for every manager in this league from trade and waiver history. Profiles power &quot;Manager style&quot; badges in rankings, trade finder, and draft context.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={buildAll}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-lg border border-purple-500/40 bg-purple-500/15 px-4 py-2 text-sm font-medium text-purple-200 hover:bg-purple-500/25 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Building…' : 'Build behavior profiles'}
        </button>
      </div>
      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
      {result && (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/80">
          <p>
            Processed {result.total} managers — {result.success} succeeded, {result.failed} failed.
          </p>
          {result.results.some((r) => !r.ok) && (
            <ul className="mt-2 space-y-0.5 text-white/60">
              {result.results.filter((r) => !r.ok).map((r) => (
                <li key={r.managerId}>
                  {r.teamName ?? r.managerId}: {r.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
