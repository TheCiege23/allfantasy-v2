'use client'

import { LeagueCreationSportSelector, LEAGUE_SPORTS, type LeagueSportOption } from '@/components/league-creation'
import { StepHeader } from './StepHelp'

export type SportSelectorProps = {
  value: string
  onChange: (sport: string) => void
}

/**
 * Sport selection for league creation. All other options adapt to this choice.
 */
export function SportSelector({ value, onChange }: SportSelectorProps) {
  const safeValue = (LEAGUE_SPORTS as readonly string[]).includes(value) ? value : LEAGUE_SPORTS[0]!
  return (
    <div className="space-y-5">
      <StepHeader
        title="Choose sport"
        description="Roster slots, scoring rules, and draft options are based on this sport. Most leagues use NFL or NBA."
        help={
          <>
            Each sport has its own positions (e.g. QB/RB/WR for NFL, C/LW/RW for NHL) and scoring. You can change the league name and many settings later.
          </>
        }
        helpTitle="How sport affects your league"
      />
      <div className="space-y-1.5">
        <LeagueCreationSportSelector
          value={safeValue as LeagueSportOption}
          onChange={(s) => onChange(s)}
          showHelper={true}
        />
      </div>
    </div>
  )
}
