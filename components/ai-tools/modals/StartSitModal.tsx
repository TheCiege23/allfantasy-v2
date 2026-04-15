'use client'

import { useCallback, useEffect, useState } from 'react'
import { Crosshair, Shield, TrendingUp, Zap, AlertTriangle } from 'lucide-react'
import { AIToolModalShell } from '../AIToolModalShell'
import type { ConfidenceLevel } from '../types'

type LineupIssue = { type: string; message: string; severity: 'high' | 'medium' | 'low' }
type LeagueData = {
  leagueId: string
  leagueName: string
  issues: LineupIssue[]
  chimmyAdvice: string
  /** Optional — server may not always return this; we render fallbacks. */
  confidence?: ConfidenceLevel
}

type Mode = 'balanced' | 'safe' | 'upside'

const MODES: { id: Mode; label: string; icon: React.ReactNode; tone: string }[] = [
  { id: 'balanced', label: 'Balanced', icon: <Crosshair className="h-3 w-3" />, tone: 'Pure expected value' },
  { id: 'safe', label: 'Safe Floor', icon: <Shield className="h-3 w-3" />, tone: 'Limit downside risk' },
  { id: 'upside', label: 'Upside Swing', icon: <TrendingUp className="h-3 w-3" />, tone: 'Chase the ceiling' },
]

const SEVERITY_STYLES: Record<LineupIssue['severity'], { border: string; bg: string; dot: string }> = {
  high: { border: 'border-red-500/20', bg: 'bg-red-500/5', dot: 'bg-red-400' },
  medium: { border: 'border-amber-500/20', bg: 'bg-amber-500/5', dot: 'bg-amber-400' },
  low: { border: 'border-white/[0.08]', bg: 'bg-white/[0.02]', dot: 'bg-white/35' },
}

export function StartSitModal({
  open,
  onClose,
  leagueId,
  leagueName,
}: {
  open: boolean
  onClose: () => void
  leagueId: string
  leagueName: string
}) {
  const [data, setData] = useState<LeagueData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('balanced')

  const load = useCallback(() => {
    if (!leagueId) return
    setLoading(true)
    setError(null)
    fetch('/api/lineup-check', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('lineup-check failed'))))
      .then((j) => {
        const row =
          (j.leagues as LeagueData[] | undefined)?.find((l) => l.leagueId === leagueId) ??
          (j.leagues as LeagueData[] | undefined)?.[0] ??
          null
        setData(row ?? null)
      })
      .catch(() => setError('Could not analyze lineups.'))
      .finally(() => setLoading(false))
  }, [leagueId])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const issues = data?.issues ?? []
  const hasIssues = issues.length > 0
  const highCount = issues.filter((i) => i.severity === 'high').length

  return (
    <AIToolModalShell
      open={open}
      onClose={onClose}
      title="Start/Sit"
      subtitle="Tactical decision room"
      accentColor="cyan"
      icon={<Crosshair className="h-5 w-5" />}
      loading={loading && !data}
      error={error}
      empty={!leagueId}
      emptyMessage="Select a league to analyze lineups."
      onRefresh={load}
      refreshing={loading && !!data}
      chimmyPrompt={`Help me with start/sit decisions for ${leagueName}`}
    >
      {/* Hero summary — fixes the "no context" feeling before user reads */}
      <div className="mb-4 rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-cyan-500/[0.06] to-transparent px-4 py-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-300/60">
          This Week · {leagueName}
        </p>
        <p className="mt-1 text-[13px] font-semibold text-white/85">
          {hasIssues
            ? `${issues.length} lineup ${issues.length === 1 ? 'decision' : 'decisions'} to resolve`
            : 'Lineup is optimized'}
        </p>
        {highCount > 0 ? (
          <p className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-semibold text-red-300">
            <AlertTriangle className="h-3 w-3" /> {highCount} high-impact {highCount === 1 ? 'call' : 'calls'}
          </p>
        ) : null}
      </div>

      {/* Strategy mode pills — the "tactical" signature of this modal */}
      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-white/30">
        Decision Lens
      </p>
      <div className="mb-4 flex gap-1.5 rounded-xl bg-white/[0.03] p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-center transition ${
              mode === m.id ? 'bg-cyan-500/15' : 'hover:bg-white/[0.04]'
            }`}
          >
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                mode === m.id ? 'text-cyan-200' : 'text-white/50'
              }`}
            >
              {m.icon} {m.label}
            </span>
            <span
              className={`text-[8px] font-medium ${
                mode === m.id ? 'text-cyan-200/60' : 'text-white/25'
              }`}
            >
              {m.tone}
            </span>
          </button>
        ))}
      </div>

      {/* Issue list */}
      {!hasIssues ? (
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] px-4 py-6 text-center">
          <Zap className="mx-auto h-6 w-6 text-emerald-400" />
          <p className="mt-2 text-[13px] font-semibold text-emerald-300">Lineup looks good</p>
          <p className="mt-1 text-[11px] text-white/40">No issues flagged for {leagueName}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {issues.slice(0, 8).map((issue, i) => {
            const s = SEVERITY_STYLES[issue.severity] ?? SEVERITY_STYLES.low
            return (
              <div key={i} className={`rounded-xl border px-4 py-3 ${s.border} ${s.bg}`}>
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
                  <p className="text-[12px] leading-relaxed text-white/75">{issue.message}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* AI recommendation block */}
      {data?.chimmyAdvice ? (
        <div className="mt-4 rounded-xl border border-cyan-500/15 bg-cyan-500/[0.04] px-4 py-3">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-cyan-300/70">
            AI Recommendation
          </p>
          <p className="text-[12px] leading-relaxed text-white/70">{data.chimmyAdvice}</p>
        </div>
      ) : null}
    </AIToolModalShell>
  )
}
