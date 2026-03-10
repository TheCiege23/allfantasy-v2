'use client'

import { useState } from 'react'
import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'
import TabDataState from '@/components/app/tabs/TabDataState'
import LegacyAIPanel from '@/components/app/tabs/LegacyAIPanel'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import { SmartDataView } from '@/components/app/league/SmartDataView'

export default function TradesTab({ leagueId }: LeagueTabProps) {
  const { data, loading, error, reload } = useLeagueSectionData<Record<string, unknown>>(leagueId, 'trades')
  const [analysis, setAnalysis] = useState<unknown>(null)
  const [running, setRunning] = useState(false)

  async function runTradeAi() {
    setRunning(true)
    try {
      const res = await fetch(`/api/app/leagues/${encodeURIComponent(leagueId)}/trades/analyze-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, trade: { send: [], receive: [] } }),
      })
      const json = await res.json().catch(() => null)
      setAnalysis(json)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <TabDataState title="Trades" loading={loading} error={error} onReload={() => void reload()}>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-sm text-white/75">Analyze trade context with live endpoint</p>
            <button
              type="button"
              onClick={runTradeAi}
              disabled={running}
              className="rounded-lg border border-cyan-400/40 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
            >
              {running ? 'Running...' : 'Analyze'}
            </button>
          </div>
          <SmartDataView data={analysis || data} />
        </div>
      </TabDataState>
      <LegacyAIPanel leagueId={leagueId} endpoint="trade-command-center" title="Legacy Trade Command Center" />
    </div>
  )
}
