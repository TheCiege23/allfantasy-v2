'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'
import TabDataState from '@/components/app/tabs/TabDataState'
import LegacyAIPanel from '@/components/app/tabs/LegacyAIPanel'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import { SmartDataView } from '@/components/app/league/SmartDataView'
import { DraftQueue } from '@/components/app/draft/DraftQueue'
import { useDraftQueue } from '@/components/app/draft/useDraftQueue'
import { LeagueDraftBoard, type DraftBoardConfig } from '@/components/app/draft/LeagueDraftBoard'
import { ManagerStyleBadge } from '@/components/ManagerStyleBadge'

export default function DraftTab({ leagueId }: LeagueTabProps) {
  const { data, loading, error, reload } =
    useLeagueSectionData<Record<string, unknown>>(leagueId, 'draft')
  const { data: draftConfig } = useLeagueSectionData<DraftBoardConfig & { leagueSize?: number }>(
    leagueId,
    'draft/config',
  )
  const [analysis, setAnalysis] = useState<unknown>(null)
  const [running, setRunning] = useState(false)

  const { queue, addToQueue, removeFromQueue, reorder } = useDraftQueue([
    { id: 'p1', name: 'Garrett Wilson', position: 'WR', team: 'NYJ', rank: 18 },
    { id: 'p2', name: 'Travis Etienne', position: 'RB', team: 'JAX', rank: 22 },
  ])

  const boardConfig: DraftBoardConfig | null =
    draftConfig && typeof draftConfig.rounds === 'number'
      ? {
          rounds: draftConfig.rounds,
          timer_seconds: draftConfig.timer_seconds ?? null,
          leagueSize: draftConfig.leagueSize ?? 12,
        }
      : null

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
    <TabDataState title="Draft" loading={loading} error={error} onReload={() => void reload()}>
      <div className="space-y-4">
        <Link
          href={`/app/league/${leagueId}/draft`}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/25"
        >
          Open draft room
        </Link>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2.3fr)_minmax(0,1.2fr)]">
          <LeagueDraftBoard
            leagueId={leagueId}
            entries={Array.isArray((data as any)?.entries) ? ((data as any).entries as any[]) : []}
            onAddToQueue={(item) => addToQueue(item)}
            config={boardConfig}
          />
          <div className="space-y-3">
            <DraftQueue queue={queue} onRemove={removeFromQueue} onReorder={reorder} />
            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-3">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-white/75">Draft AI recommendation</p>
                  <button
                    type="button"
                    onClick={runDraftAi}
                    disabled={running}
                    className="rounded-lg border border-cyan-400/40 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
                  >
                    {running ? 'Running...' : 'Run Draft AI'}
                  </button>
                </div>
                <p className="text-[10px] text-white/60">
                  Use your queue to star players you want to target. AI can later consume this queue when recommending picks.
                </p>
                <p className="text-[9px] text-white/40">
                  Manager style badges (Trade Finder, Rankings): build in Settings → Behavior Profiles.
                </p>
              </div>
              <SmartDataView data={analysis || data} />
            </div>
            <LegacyAIPanel leagueId={leagueId} endpoint="draft-war-room" title="Legacy Draft War Room" />
          </div>
        </div>
      </div>
    </TabDataState>
  )
}

