'use client'

import { LeagueCreationSportSelector, LEAGUE_SPORTS, type LeagueSportOption } from '@/components/league-creation'
import { COLLEGE_PAIR_WIZARD_PRIMARY_SPORTS } from '@/lib/sport-scope'
import type { LeagueTypeId } from '@/lib/league-creation-wizard/types'
import { StepHeader } from './StepHelp'

export type SportSelectorProps = {
  value: string
  onChange: (sport: string) => void
  /** When Devy or C2C is selected, only NFL and NBA are available (college pools pair in creation). */
  leagueType?: LeagueTypeId
}

/**
 * Sport selection for league creation. All other options adapt to this choice.
 */
export function SportSelector({ value, onChange, leagueType }: SportSelectorProps) {
  const collegePairOnly = leagueType === 'devy' || leagueType === 'c2c'
  const allowedSports = collegePairOnly ? COLLEGE_PAIR_WIZARD_PRIMARY_SPORTS : undefined
  const safeValue = (() => {
    if (collegePairOnly) {
      const v = (LEAGUE_SPORTS as readonly string[]).includes(value) ? value : 'NFL'
      return (COLLEGE_PAIR_WIZARD_PRIMARY_SPORTS as readonly string[]).includes(v) ? v : 'NFL'
    }
    return (LEAGUE_SPORTS as readonly string[]).includes(value) ? value : LEAGUE_SPORTS[0]!
  })()
  return (
    <div className="space-y-5">
      <StepHeader
        title="Choose sport"
        description={
          collegePairOnly
            ? 'Devy and Campus to Canton use NFL or NBA as the pro league; NCAAF or NCAAB college pools are attached automatically when the league is created.'
            : 'Roster slots, scoring rules, and draft options are based on this sport. Most leagues use NFL or NBA.'
        }
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
          allowedSports={allowedSports}
        />
      </div>
    </div>
  )
}
