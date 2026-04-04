'use client'

/**
 * Matchup header + Chimmy IDP matchup analysis (POST /api/idp/ai matchup_analysis).
 */

import { useState } from 'react'
import { useAfSubGate } from '@/hooks/useAfSubGate'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { IDPMatchupReport } from '@/lib/idp/ai/idpChimmy'

export function IDPMatchupView({
  leagueId,
  week,
  opponentLabel = 'Opponent',
}: {
  leagueId: string
  week: number
  opponentLabel?: string
}) {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<IDPMatchupReport | null>(null)
  const { handleApiResponse } = useAfSubGate('commissioner_idp_analysis')

  const run = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/idp/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ leagueId, week, action: 'matchup_analysis' }),
      })
      if (!(await handleApiResponse(res))) return
      const data = (await res.json().catch(() => null)) as IDPMatchupReport | null
      if (data && typeof data.analysis === 'string') setReport(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-cyan-500/15 bg-[#040915]/90 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-white/40">Week {week}</p>
          <p className="text-sm font-semibold text-white">vs {opponentLabel}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => void run()}
          className="gap-1.5 border-amber-500/30 text-amber-100 hover:bg-amber-950/35"
          data-testid="idp-matchup-chimmy-analysis"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {loading ? '…' : 'Chimmy Analysis'}
        </Button>
      </div>
      {report ? (
        <div className="mt-3 space-y-2 text-sm text-white/85">
          <p className="whitespace-pre-wrap">{report.analysis}</p>
          {report.defensiveHighlights ? (
            <p className="text-xs text-cyan-200/80">{report.defensiveHighlights}</p>
          ) : null}
          {report.opponentAdvantage ? (
            <p className="text-xs text-amber-200/80">Their edge: {report.opponentAdvantage}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-white/45">IDP matchup insights appear here after you run Chimmy.</p>
      )}
    </div>
  )
}
