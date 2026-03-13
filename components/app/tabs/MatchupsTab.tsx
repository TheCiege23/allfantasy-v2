'use client'

import { useState } from 'react'
import TabDataState from '@/components/app/tabs/TabDataState'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'
import { MatchupCard, type MatchupSummary } from '@/components/app/matchups/MatchupCard'
import { MatchupDetailView } from '@/components/app/matchups/MatchupDetailView'

const MOCK_MATCHUPS: MatchupSummary[] = [
  {
    id: 'm1',
    teamA: 'Your Team',
    teamB: 'Rival GM',
    scoreA: 94.2,
    scoreB: 87.5,
    projA: 118.4,
    projB: 112.1,
    winProbA: 0.63,
    remainingA: 6,
    remainingB: 7,
  },
  {
    id: 'm2',
    teamA: 'Underdog United',
    teamB: 'Stacked Contender',
    scoreA: 72.1,
    scoreB: 104.9,
    projA: 95.3,
    projB: 132.6,
    winProbA: 0.19,
    remainingA: 5,
    remainingB: 4,
  },
]

export default function MatchupsTab({ leagueId }: LeagueTabProps) {
  const { loading, error, reload } = useLeagueSectionData<Record<string, unknown>>(leagueId, 'matchups')
  const [selected, setSelected] = useState<MatchupSummary | null>(MOCK_MATCHUPS[0] ?? null)

  return (
    <TabDataState title="Matchups" loading={loading} error={error} onReload={() => void reload()}>
      <div className="space-y-3">
        <p className="text-xs text-white/60">
          Weekly head-to-head matchups with live scoring, projections, and win probabilities.
        </p>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-2">
            {MOCK_MATCHUPS.map((m) => (
              <MatchupCard
                key={m.id}
                matchup={m}
                onClick={() => setSelected(m)}
              />
            ))}
          </div>
          <MatchupDetailView matchup={selected} />
        </div>
      </div>
    </TabDataState>
  )
}

