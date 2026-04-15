'use client'

import { useCallback, useEffect, useState } from 'react'
import { Crown } from 'lucide-react'
import { AIToolModalShell } from '../AIToolModalShell'

type Team = { teamName: string; powerScore?: number; rank?: number }

export function PowerRankingsModal({ open, onClose, leagueId, leagueName }: { open: boolean; onClose: () => void; leagueId: string; leagueName: string }) {
  const [teams, setTeams] = useState<Team[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!leagueId) return
    setLoading(true); setError(null)
    fetch(`/api/leagues/${encodeURIComponent(leagueId)}/power-rankings`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => { setTeams(j.teams ?? j.rankings ?? []); setSummary(j.summary ?? j.narrative ?? null) })
      .catch(() => setError('Could not load power rankings.'))
      .finally(() => setLoading(false))
  }, [leagueId])

  useEffect(() => { if (open) load() }, [open, load])

  return (
    <AIToolModalShell
      open={open} onClose={onClose}
      title="Power Rankings" subtitle="Editorial league intelligence"
      accentColor="violet"
      icon={<Crown className="h-5 w-5" />}
      loading={loading && teams.length === 0} error={error}
      empty={!leagueId} emptyMessage="Select a league for power rankings."
      onRefresh={load} refreshing={loading && teams.length > 0}
      chimmyPrompt={`Power rankings breakdown for ${leagueName}`}
    >
      {summary && (
        <div className="mb-4 rounded-xl border border-violet-500/10 bg-violet-500/[0.03] px-4 py-3">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-violet-400/50">League Narrative</p>
          <p className="text-[12px] leading-relaxed text-white/55">{summary}</p>
        </div>
      )}

      <div className="space-y-1">
        {teams.map((t, i) => (
          <div key={i} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 ${
            i === 0 ? 'border border-amber-500/15 bg-amber-500/[0.04]' : 'border border-white/[0.04] bg-white/[0.01]'
          }`}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-black ${
              i === 0 ? 'bg-amber-500/15 text-amber-300' :
              i <= 2 ? 'bg-violet-500/10 text-violet-300' :
              'bg-white/[0.04] text-white/30'
            }`}>
              {(t.rank ?? i + 1)}
            </span>
            <span className="flex-1 text-[13px] font-semibold text-white/80">{t.teamName}</span>
            {t.powerScore != null && (
              <span className="text-[11px] font-bold text-white/40">{t.powerScore.toFixed(1)}</span>
            )}
          </div>
        ))}
      </div>
    </AIToolModalShell>
  )
}
