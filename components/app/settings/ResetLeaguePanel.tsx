'use client'

import { useState } from 'react'
import { RotateCcw, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

export default function ResetLeaguePanel({ leagueId }: { leagueId?: string }) {
  const [loading, setLoading] = useState(false)

  const handleReset = async () => {
    if (!leagueId || loading) return
    if (!confirm('Reset league? This may clear rosters and standings. This action cannot be undone. Confirm?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/commissioner/leagues/${encodeURIComponent(leagueId)}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success('League reset completed')
      } else {
        toast.error(data?.error || 'Reset failed or not available')
      }
    } catch {
      toast.error('Request failed')
    } finally {
      setLoading(false)
    }
  }

  if (!leagueId) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Reset League</h3>
        <p className="mt-2 text-xs text-white/65">Select a league to access reset options.</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2">
        <RotateCcw className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Reset League</h3>
      </div>
      <p className="mt-2 text-xs text-white/65">
        Reset league data (rosters, standings, etc.). Use your platform (e.g. Sleeper) for full control, or request reset below.
      </p>
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
        <p className="text-xs text-white/70">This action may not be available for all leagues. Contact support if you need a full reset.</p>
      </div>
      <button
        type="button"
        onClick={handleReset}
        disabled={loading}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-500/20 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
        Request league reset
      </button>
    </section>
  )
}
