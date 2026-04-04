'use client'

import { useState } from 'react'
import type { UserLeague } from '@/app/dashboard/types'
import { useSleeperPlayers } from '@/lib/hooks/useSleeperPlayers'
import { IDPMatchupView } from '@/app/idp/components/IDPMatchupView'

export type ScoresTabProps = {
  league: UserLeague
  sport?: string
  idpLeagueUi?: boolean
}

export function ScoresTab({ league, sport, idpLeagueUi = false }: ScoresTabProps) {
  const resolvedSport = sport ?? league.sport
  const [week, setWeek] = useState(1)
  const { players } = useSleeperPlayers(resolvedSport)

  if (idpLeagueUi) {
    return (
      <div className="space-y-4 p-5" data-sport={resolvedSport}>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-white/60 hover:bg-white/[0.06]"
            onClick={() => setWeek((w) => Math.max(1, w - 1))}
            aria-label="Previous week"
          >
            ←
          </button>
          <span className="text-sm font-semibold text-white">Week {week}</span>
          <button
            type="button"
            className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-white/60 hover:bg-white/[0.06]"
            onClick={() => setWeek((w) => w + 1)}
            aria-label="Next week"
          >
            →
          </button>
        </div>
        <IDPMatchupView
          yourTeamName="Your team"
          oppTeamName="Opponent"
          week={week}
          sport={resolvedSport}
          yourOffenseIds={[]}
          oppOffenseIds={[]}
          yourDefenseIds={['4040', '4041', '4042']}
          oppDefenseIds={['4043', '4044', '4045']}
          players={players}
          live
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-5" data-sport={resolvedSport}>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-white/60 hover:bg-white/[0.06]"
          onClick={() => setWeek((w) => Math.max(1, w - 1))}
          aria-label="Previous week"
        >
          ←
        </button>
        <span className="text-sm font-semibold text-white">Week {week}</span>
        <button
          type="button"
          className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-white/60 hover:bg-white/[0.06]"
          onClick={() => setWeek((w) => w + 1)}
          aria-label="Next week"
        >
          →
        </button>
      </div>

      <div className="rounded-2xl border border-dashed border-white/[0.12] bg-[#0c0c1e]/60 px-6 py-16 text-center">
        <p className="text-sm font-medium text-white/55">Scores will appear once the season begins</p>
        <p className="mt-2 text-xs text-white/35">{league.name}</p>
      </div>
    </div>
  )
}
