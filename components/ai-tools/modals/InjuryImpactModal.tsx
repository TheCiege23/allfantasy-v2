'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { AIToolModalShell } from '../AIToolModalShell'

type InjuryItem = { playerName?: string; player?: string; team?: string; status?: string; description?: string; sport?: string }

function severityColor(status: string) {
  const s = status.toLowerCase()
  if (s === 'out' || s === 'ir') return { border: 'border-red-500/15', bg: 'bg-red-500/[0.04]', dot: 'bg-red-400', text: 'text-red-300' }
  if (s === 'doubtful') return { border: 'border-orange-500/15', bg: 'bg-orange-500/[0.04]', dot: 'bg-orange-400', text: 'text-orange-300' }
  if (s === 'questionable') return { border: 'border-amber-500/15', bg: 'bg-amber-500/[0.04]', dot: 'bg-amber-400', text: 'text-amber-300' }
  return { border: 'border-white/[0.06]', bg: 'bg-white/[0.02]', dot: 'bg-white/30', text: 'text-white/50' }
}

export function InjuryImpactModal({ open, onClose, sport = 'NFL' }: { open: boolean; onClose: () => void; sport?: string }) {
  const [injuries, setInjuries] = useState<InjuryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true); setError(null)
    fetch(`/api/dashboard/ai-tools/injury-brief?sport=${encodeURIComponent(sport)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setInjuries(j.injuries ?? j.articles ?? j.data ?? []))
      .catch(() => setError('Could not load injury data.'))
      .finally(() => setLoading(false))
  }, [sport])

  useEffect(() => { if (open) load() }, [open, load])

  const critical = injuries.filter((i) => ['out', 'ir', 'doubtful'].includes((i.status ?? '').toLowerCase()))
  const other = injuries.filter((i) => !['out', 'ir', 'doubtful'].includes((i.status ?? '').toLowerCase()))

  return (
    <AIToolModalShell
      open={open} onClose={onClose}
      title="Injury Impact" subtitle="Availability and risk alerts"
      accentColor="red"
      icon={<ShieldAlert className="h-5 w-5" />}
      loading={loading && injuries.length === 0} error={error}
      empty={injuries.length === 0 && !loading} emptyMessage="No injury reports available."
      onRefresh={load} refreshing={loading && injuries.length > 0}
      chimmyPrompt={`What injuries should I worry about in ${sport}?`}
    >
      {critical.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-red-400/60">
            <AlertTriangle className="h-3 w-3" /> Critical
          </p>
          <div className="space-y-1.5">
            {critical.slice(0, 8).map((inj, i) => <InjuryRow key={i} injury={inj} />)}
          </div>
        </div>
      )}
      {other.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/25">Monitoring</p>
          <div className="space-y-1">
            {other.slice(0, 12).map((inj, i) => <InjuryRow key={i} injury={inj} />)}
          </div>
        </div>
      )}
    </AIToolModalShell>
  )
}

function InjuryRow({ injury }: { injury: InjuryItem }) {
  const name = injury.playerName ?? injury.player ?? 'Unknown'
  const status = injury.status ?? 'Unknown'
  const sev = severityColor(status)
  return (
    <div className={`flex items-center gap-3 rounded-xl border ${sev.border} ${sev.bg} px-4 py-2.5`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${sev.dot}`} />
      <div className="min-w-0 flex-1">
        <span className="text-[12px] font-semibold text-white/80">{name}</span>
        {injury.team && <span className="ml-1.5 text-[9px] text-white/25">{injury.team}</span>}
      </div>
      <span className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase ${sev.text} bg-white/[0.04]`}>{status}</span>
    </div>
  )
}
