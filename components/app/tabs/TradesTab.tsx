'use client'

import { useState } from 'react'
import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'
import TabDataState from '@/components/app/tabs/TabDataState'
import LegacyAIPanel from '@/components/app/tabs/LegacyAIPanel'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import { TradeBuilder } from '@/components/app/trade/TradeBuilder'
import { TradeHistory } from '@/components/app/trade/TradeHistory'

type TradesTabMode = 'builder' | 'history'

export default function TradesTab({ leagueId }: LeagueTabProps) {
  const { loading, error, reload } =
    useLeagueSectionData<Record<string, unknown>>(leagueId, 'trades')
  const [mode, setMode] = useState<TradesTabMode>('builder')

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <TabDataState
        title="Trades"
        loading={loading}
        error={error}
        onReload={() => void reload()}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setMode('builder')}
              className={`rounded-full px-3 py-1.5 text-xs ${
                mode === 'builder'
                  ? 'bg-white text-black'
                  : 'border border-white/20 bg-black/40 text-white/75 hover:bg-white/10'
              }`}
            >
              Trade Center
            </button>
            <button
              type="button"
              onClick={() => setMode('history')}
              className={`rounded-full px-3 py-1.5 text-xs ${
                mode === 'history'
                  ? 'bg-white text-black'
                  : 'border border-white/20 bg-black/40 text-white/75 hover:bg-white/10'
              }`}
            >
              Trade History
            </button>
          </div>

          {mode === 'builder' ? (
            <TradeBuilder leagueId={leagueId} />
          ) : (
            <TradeHistory leagueId={leagueId} />
          )}
        </div>
      </TabDataState>
      <LegacyAIPanel
        leagueId={leagueId}
        endpoint="trade-command-center"
        title="Legacy Trade Command Center"
      />
    </div>
  )
}

