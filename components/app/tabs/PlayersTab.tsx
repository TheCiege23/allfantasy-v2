'use client'

import { useMemo, useState } from 'react'
import TabDataState from '@/components/app/tabs/TabDataState'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'
import { SmartDataView } from '@/components/app/league/SmartDataView'

export default function PlayersTab({ leagueId }: LeagueTabProps) {
  const [query, setQuery] = useState('')
  const section = useMemo(() => (query.trim().length >= 2 ? `players?q=${encodeURIComponent(query.trim())}` : 'players'), [query])
  const { data, loading, error, reload } = useLeagueSectionData<unknown>(leagueId, section)

  return (
    <TabDataState title="Players" loading={loading} error={error} onReload={() => void reload()}>
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <label className="block text-xs font-medium text-white/70">Search players</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter name or position (min 2 chars)"
            className="mt-2 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-400/60"
          />
        </div>
        <SmartDataView data={data} />
      </div>
    </TabDataState>
  )
}
