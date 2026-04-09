'use client'

import { useCallback, useEffect, useState } from 'react'
import { Zap, Loader2, ShieldCheck, Users, X } from 'lucide-react'
import { SimulationReportModal } from './SimulationReportModal'

interface SimulateLeagueButtonProps {
  leagueId: string
}

type CommissionerMode = 'spectator' | 'participating'

/**
 * Floating simulation button — only visible to site admin.
 * Asks whether to simulate with commissioner as spectator or participating player.
 */
export function SimulateLeagueButton({ leagueId }: SimulateLeagueButtonProps) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [showModeSelect, setShowModeSelect] = useState(false)
  const [running, setRunning] = useState(false)
  const [report, setReport] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/user/me')
      .then((r) => r.json())
      .then((data) => {
        if (data?.isAdmin === true) setIsAdmin(true)
      })
      .catch(() => {})
  }, [])

  const runSimulation = useCallback(async (commissionerMode: CommissionerMode) => {
    setShowModeSelect(false)
    setRunning(true)
    setError(null)
    setReport(null)

    try {
      const res = await fetch('/api/admin/simulate-league', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, commissionerMode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Simulation failed')
      setReport(data.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed')
    } finally {
      setRunning(false)
    }
  }, [leagueId])

  if (!isAdmin) return null

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setShowModeSelect(true)}
        disabled={running}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 text-sm font-medium text-amber-100 shadow-lg backdrop-blur-sm transition hover:bg-amber-400/20 hover:border-amber-400/60 disabled:opacity-50"
        title="Admin: Simulate full season"
      >
        {running ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Simulating...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Simulate
          </>
        )}
      </button>

      {/* Mode selection popup */}
      {showModeSelect && (
        <div className="fixed bottom-20 right-6 z-50 w-80 rounded-2xl border border-white/10 bg-[#0a1628] p-5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Simulation Mode</h3>
            <button onClick={() => setShowModeSelect(false)} className="text-white/30 hover:text-white/60">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-white/50 mb-4">
            How is the commissioner running this league?
          </p>
          <div className="space-y-2">
            <button
              onClick={() => runSimulation('spectator')}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/5"
            >
              <ShieldCheck className="h-5 w-5 text-cyan-400 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-white">Spectator Commissioner</div>
                <div className="text-xs text-white/40">Commissioner manages but does NOT play. Full access to idol info, votes, and overrides.</div>
              </div>
            </button>
            <button
              onClick={() => runSimulation('participating')}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-amber-400/30 hover:bg-amber-400/5"
            >
              <Users className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-white">Participating Commissioner</div>
                <div className="text-xs text-white/40">Commissioner plays as a regular manager. Blind mode active — no access to hidden info. System handles votes autonomously.</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-20 right-6 z-50 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100 shadow-lg backdrop-blur-sm max-w-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-300/60 hover:text-red-200">dismiss</button>
        </div>
      )}

      {/* Report modal */}
      {report && (
        <SimulationReportModal
          report={report as any}
          onClose={() => setReport(null)}
        />
      )}
    </>
  )
}
