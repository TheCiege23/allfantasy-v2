'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Shield, RefreshCw, Award, TrendingUp, BookOpen, FileText } from 'lucide-react'
import type { LeagueTabProps } from '@/components/app/tabs/types'

export default function ReputationPanel({ leagueId }: LeagueTabProps) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{
    processed: number
    created: number
    updated: number
    results?: Array<{ managerId: string; tier: string; overallScore: number }>
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reputations, setReputations] = useState<Array<{ managerId: string; tier: string; overallScore: number }>>([])
  const [selectedManagerId, setSelectedManagerId] = useState<string>('')
  const [explainNarrative, setExplainNarrative] = useState<string | null>(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [evidenceCount, setEvidenceCount] = useState<number | null>(null)

  const fetchReputations = useCallback(() => {
    if (!leagueId) return
    fetch(`/api/leagues/${encodeURIComponent(leagueId)}/reputation?limit=100`)
      .then((r) => r.json())
      .then((data) => {
        const list = data?.reputations ?? []
        setReputations(list.map((r: { managerId: string; tier: string; overallScore: number }) => ({
          managerId: r.managerId,
          tier: r.tier,
          overallScore: r.overallScore,
        })))
        setSelectedManagerId((prev) => (list.length && !list.some((x: { managerId: string }) => x.managerId === prev) ? list[0].managerId : prev))
      })
      .catch(() => {})
  }, [leagueId])

  useEffect(() => {
    fetchReputations()
  }, [fetchReputations])

  async function explainManager() {
    if (!selectedManagerId) return
    setExplainLoading(true)
    setExplainNarrative(null)
    setEvidenceCount(null)
    try {
      const [explainRes, evidenceRes] = await Promise.all([
        fetch(`/api/leagues/${encodeURIComponent(leagueId)}/reputation/explain`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ managerId: selectedManagerId }),
        }),
        fetch(`/api/leagues/${encodeURIComponent(leagueId)}/reputation/evidence?managerId=${encodeURIComponent(selectedManagerId)}&limit=5`),
      ])
      const explainData = await explainRes.json().catch(() => ({}))
      const evidenceData = await evidenceRes.json().catch(() => ({}))
      setExplainNarrative(explainData?.narrative ?? explainData?.error ?? 'No explanation available.')
      setEvidenceCount(Array.isArray(evidenceData?.evidence) ? evidenceData.evidence.length : 0)
    } catch {
      setExplainNarrative('Failed to load explanation.')
    } finally {
      setExplainLoading(false)
    }
  }

  async function runEngine() {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/reputation/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replace: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Failed to run')
        return
      }
      setResult({
        processed: data.processed ?? 0,
        created: data.created ?? 0,
        updated: data.updated ?? 0,
        results: data.results ?? [],
      })
      fetchReputations()
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
        <Shield className="h-4 w-4 text-cyan-400" />
        Reputation System
      </h3>
      <p className="mt-2 text-xs text-white/65">
        Compute trust scores (reliability, activity, trade fairness, sportsmanship, commissioner trust, toxicity risk) for every manager. Scores are evidence-based; tiers: Legendary, Elite, Trusted, Reliable, Neutral, Risky. Reputation badges appear in member lists and trade context.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/app/league/${encodeURIComponent(leagueId)}?tab=Hall of Fame`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/25"
        >
          <Award className="h-3.5 w-3.5" /> Hall of Fame
        </Link>
        <Link
          href={`/app/league/${encodeURIComponent(leagueId)}?tab=Legacy`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/25"
        >
          <TrendingUp className="h-3.5 w-3.5" /> Legacy leaderboard
        </Link>
      </div>
      {reputations.length > 0 && (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <h4 className="text-xs font-semibold text-white/80 mb-2">Explain a manager</h4>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-xs text-white"
              value={selectedManagerId}
              onChange={(e) => {
                setSelectedManagerId(e.target.value)
                setExplainNarrative(null)
                setEvidenceCount(null)
              }}
            >
              {reputations.map((r) => (
                <option key={r.managerId} value={r.managerId}>
                  {r.managerId} — {r.tier} ({r.overallScore.toFixed(0)})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50"
              disabled={explainLoading}
              onClick={explainManager}
            >
              <BookOpen className="h-3 w-3" /> {explainLoading ? '…' : 'AI explain'}
            </button>
            <a
              href={`/app/league/${encodeURIComponent(leagueId)}/legacy/breakdown?entityType=MANAGER&entityId=${encodeURIComponent(selectedManagerId)}`}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/25"
            >
              <FileText className="h-3 w-3" /> Legacy breakdown
            </a>
          </div>
          {explainNarrative && (
            <div className="mt-2 p-2 rounded-lg bg-zinc-900/80 text-xs text-zinc-300 border border-zinc-700">
              {explainNarrative}
              {evidenceCount !== null && (
                <p className="mt-1 text-zinc-500">Evidence items loaded: {evidenceCount}</p>
              )}
            </div>
          )}
        </div>
      )}
      <div className="mt-4">
        <button
          type="button"
          onClick={runEngine}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Running…' : 'Run reputation engine'}
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
            Processed {result.processed} managers — {result.created} created, {result.updated} updated.
          </p>
          {result.results && result.results.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-white/60 max-h-32 overflow-y-auto">
              {result.results.slice(0, 10).map((r) => (
                <li key={r.managerId}>
                  {r.managerId}: {r.tier} ({r.overallScore.toFixed(0)})
                </li>
              ))}
              {result.results.length > 10 && (
                <li>…and {result.results.length - 10} more</li>
              )}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
