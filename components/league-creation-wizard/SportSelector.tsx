'use client'

import { LeagueCreationSportSelector, LEAGUE_SPORTS, type LeagueSportOption } from '@/components/league-creation'
import { getAllowedSportsForLeagueType } from '@/lib/league-creation-wizard/league-type-registry'
import type { LeagueTypeId } from '@/lib/league-creation-wizard/types'
import { StepHeader } from './StepHelp'

export type SportSelectorProps = {
  value: string
  onChange: (sport: string) => void
  /** Filter sports to those supported by the selected league type. */
  leagueType?: LeagueTypeId
}

/**
 * Sport selection for league creation. Filtered by the selected league type.
 */
export function SportSelector({ value, onChange, leagueType }: SportSelectorProps) {
  const allowedSports = leagueType ? getAllowedSportsForLeagueType(leagueType) : undefined
  const safeValue = (() => {
    if (allowedSports) {
      const v = (LEAGUE_SPORTS as readonly string[]).includes(value) ? value : 'NFL'
      return (allowedSports as readonly string[]).includes(v) ? v : (allowedSports[0] ?? 'NFL')
    }
    return (LEAGUE_SPORTS as readonly string[]).includes(value) ? value : LEAGUE_SPORTS[0]!
  })()

  const isRestricted = allowedSports && allowedSports.length < LEAGUE_SPORTS.length
  const isTournament = leagueType === 'tournament'

  return (
    <div className="space-y-5">
      <StepHeader
        title="Choose sport"
        description={
          isTournament
            ? 'The sport you pick applies to every feeder league in the tournament (player pool, positions, and scoring templates).'
            : isRestricted
              ? `This league type supports ${allowedSports!.length} sport${allowedSports!.length === 1 ? '' : 's'}. Roster slots, scoring, and draft options adapt to your choice.`
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
          leagueType={leagueType}
        />
      </div>
    </div>
  )
}
