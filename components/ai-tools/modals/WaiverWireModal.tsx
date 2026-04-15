'use client'

import { useCallback, useEffect, useState } from 'react'
import { Target, Zap, Clock } from 'lucide-react'
import { AIToolModalShell } from '../AIToolModalShell'

type Pick = { playerName: string; reason: string; priority: number; position?: string; team?: string }

function urgencyBadge(priority: number) {
  if (priority >= 8) return <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase text-red-300">Urgent</span>
  if (priority >= 5) return <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-300">Priority</span>
  return <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[8px] font-bold uppercase text-white/30">Watch</span>
}

export function WaiverWireModal({ open, onClose, leagueId, leagueName }: { open: boolean; onClose: () => void; leagueId: string; leagueName: string }) {
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!leagueId) return
    setLoading(true); setError(null)
    fetch('/api/waiver-ai-suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setPicks(j.suggestions ?? j.picks ?? j.targets ?? []))
      .catch(() => setError('Could not load waiver targets.'))
      .finally(() => setLoading(false))
  }, [leagueId])

  useEffect(() => { if (open) load() }, [open, load])

  return (
    <AIToolModalShell
      open={open} onClose={onClose}
      title="Waiver Wire" subtitle="Opportunity scanner"
      accentColor="emerald"
      icon={<Target className="h-5 w-5" />}
      loading={loading && picks.length === 0} error={error}
      empty={!leagueId} emptyMessage="Select a league for waiver AI targets."
      onRefresh={load} refreshing={loading && picks.length > 0}
      chimmyPrompt={`Waiver wire targets for ${leagueName}: who should I add?`}
    >
      <div className="space-y-1.5">
        {picks.map((p, i) => (
          <div key={i} className="group flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 transition hover:border-emerald-500/15 hover:bg-emerald-500/[0.02]">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-[11px] font-black text-emerald-400">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-white/85">{p.playerName}</span>
                {p.position && <span className="text-[9px] font-semibold text-cyan-300/50">{p.position}</span>}
                {p.team && <span className="text-[9px] text-white/25">{p.team}</span>}
                {urgencyBadge(p.priority)}
              </div>
              <p className="mt-0.5 text-[10px] leading-snug text-white/35">{p.reason}</p>
            </div>
          </div>
        ))}
        {picks.length === 0 && !loading && !error && leagueId && (
          <div className="py-6 text-center">
            <Clock className="mx-auto h-6 w-6 text-white/15" />
            <p className="mt-2 text-[12px] text-white/30">No suggestions yet. Try refreshing after a league sync.</p>
          </div>
        )}
      </div>
    </AIToolModalShell>
  )
}
