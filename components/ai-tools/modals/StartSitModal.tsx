'use client'

import { useCallback, useEffect, useState } from 'react'
import { Crosshair, Shield, TrendingUp, Zap } from 'lucide-react'
import { AIToolModalShell } from '../AIToolModalShell'

type LineupIssue = { type: string; message: string; severity: string }
type LeagueData = { leagueId: string; leagueName: string; issues: LineupIssue[]; chimmyAdvice: string }

const MODES = [
  { id: 'balanced', label: 'Balanced', icon: <Crosshair className="h-3 w-3" /> },
  { id: 'safe', label: 'Safe Floor', icon: <Shield className="h-3 w-3" /> },
  { id: 'upside', label: 'Upside Swing', icon: <TrendingUp className="h-3 w-3" /> },
] as const

export function StartSitModal({ open, onClose, leagueId, leagueName }: { open: boolean; onClose: () => void; leagueId: string; leagueName: string }) {
  const [data, setData] = useState<LeagueData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<string>('balanced')

  const load = useCallback(() => {
    if (!leagueId) return
    setLoading(true); setError(null)
    fetch('/api/lineup-check', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        const row = j.leagues?.find((l: any) => l.leagueId === leagueId) ?? j.leagues?.[0]
        setData(row ?? null)
      })
      .catch(() => setError('Could not analyze lineups.'))
      .finally(() => setLoading(false))
  }, [leagueId])

  useEffect(() => { if (open) load() }, [open, load])

  const issues = data?.issues ?? []
  const hasIssues = issues.length > 0

  return (
    <AIToolModalShell
      open={open} onClose={onClose}
      title="Start/Sit" subtitle="Tactical decision room"
      accentColor="cyan"
      icon={<Crosshair className="h-5 w-5" />}
      loading={loading && !data} error={error}
      empty={!leagueId} emptyMessage="Select a league to analyze lineups."
      onRefresh={load} refreshing={loading && !!data}
      chimmyPrompt={`Help me with start/sit decisions for ${leagueName}`}
    >
      {/* Strategy mode */}
      <div className="mb-4 flex gap-1.5 rounded-xl bg-white/[0.03] p-1">
        {MODES.map((m) => (
          <button
            key={m.id} type="button" onClick={() => setMode(m.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-semibold transition ${
              mode === m.id ? 'bg-cyan-500/15 text-cyan-300' : 'text-white/35 hover:text-white/55'
            }`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Issues */}
      <div className="space-y-2">
        {!hasIssues ? (
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-6 text-center">
            <Zap className="mx-auto h-6 w-6 text-emerald-400" />
            <p className="mt-2 text-[13px] font-semibold text-emerald-300">Lineup looks good</p>
            <p className="mt-1 text-[11px] text-white/35">No issues flagged for {leagueName}.</p>
          </div>
        ) : (
          issues.slice(0, 8).map((issue, i) => (
            <div key={i} className={`rounded-xl border px-4 py-3 ${
              issue.severity === 'high' ? 'border-red-500/15 bg-red-500/5' :
              issue.severity === 'medium' ? 'border-amber-500/15 bg-amber-500/5' :
              'border-white/[0.06] bg-white/[0.02]'
            }`}>
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  issue.severity === 'high' ? 'bg-red-400' : issue.severity === 'medium' ? 'bg-amber-400' : 'bg-white/30'
                }`} />
                <p className="text-[12px] text-white/70">{issue.message}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI Advice */}
      {data?.chimmyAdvice && (
        <div className="mt-4 rounded-xl border border-cyan-500/10 bg-cyan-500/[0.03] px-4 py-3">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-cyan-400/50">AI Recommendation</p>
          <p className="text-[12px] leading-relaxed text-white/60">{data.chimmyAdvice}</p>
        </div>
      )}
    </AIToolModalShell>
  )
}
