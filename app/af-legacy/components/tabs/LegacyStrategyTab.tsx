'use client'

import StrategyPlanner from '@/components/StrategyPlanner'

type LegacyLeagueLite = {
  league_id: string
  season: number
}

export default function LegacyStrategyTab({
  leagues,
  username,
}: {
  leagues: LegacyLeagueLite[]
  username?: string
}) {
  const latestSeason = leagues.length > 0 ? Math.max(...leagues.map((l) => l.season)) : undefined
  const currentSeasonLeagues = latestSeason ? leagues.filter((l) => l.season === latestSeason) : []

  return (
    <>
      <p className="text-center text-sm sm:text-base text-white/60 mb-4">
        Get a personalized strategy based on your roster, standings, and draft capital.
      </p>
      <div className="bg-black/30 border border-purple-500/20 rounded-2xl p-4 sm:p-6">
        <StrategyPlanner leagues={currentSeasonLeagues as any} sleeperUsername={username || ""} />
      </div>
    </>
  )
}

