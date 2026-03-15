"use client"

import type { LeagueTabProps } from "@/components/app/tabs/types"
import { HallOfFameSection } from "@/components/rankings/HallOfFameSection"

const DEFAULT_SEASONS = (() => {
  const y = new Date().getFullYear()
  return [String(y), String(y - 1), String(y - 2)]
})()

export default function HallOfFameTab({ leagueId }: LeagueTabProps) {
  return (
    <div className="space-y-4 p-4">
      <HallOfFameSection
        leagueId={leagueId}
        seasons={DEFAULT_SEASONS}
        defaultSeason={DEFAULT_SEASONS[0]}
      />
    </div>
  )
}
