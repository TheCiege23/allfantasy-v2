'use client'

import { useState } from 'react'
import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'
import TabDataState from '@/components/app/tabs/TabDataState'
import LegacyAIPanel from '@/components/app/tabs/LegacyAIPanel'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import { SmartDataView } from '@/components/app/league/SmartDataView'

export default function DraftTab({ leagueId }: LeagueTabProps) {
  const { data, loading, error, reload } = useLeagueSectionData<Record<string, unknown>>(leagueId, 'draft')
  const [analysis, setAnalysis] = useState<unknown>(null)
  const [running, setRunning] = useState(false)

  async function runDraftAi() {
    setRunning(true)
    try {
      const res = await fetch(`/api/app/league/${encodeURIComponent(leagueId)}/draft/recommend-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId }),
      })
      const json = await res.json().catch(() => null)
      setAnalysis(json)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <TabDataState title="Draft" loading={loading} error={error} onReload={() => void reload()}>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-sm text-white/75">Refresh draft recommendation</p>
            <button
              type="button"
              onClick={runDraftAi}
              disabled={running}
              className="rounded-lg border border-cyan-400/40 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
            >
              {running ? 'Running...' : 'Run Draft AI'}
            </button>
          </div>
          <SmartDataView data={analysis || data} />
        </div>
      </TabDataState>
      <LegacyAIPanel leagueId={leagueId} endpoint="draft-war-room" title="Legacy Draft War Room" />
    </div>
  )
}
