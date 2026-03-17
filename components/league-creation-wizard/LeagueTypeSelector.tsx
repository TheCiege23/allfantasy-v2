'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  LEAGUE_TYPE_IDS,
  LEAGUE_TYPE_LABELS,
  getAllowedLeagueTypesForSport,
} from '@/lib/league-creation-wizard/league-type-registry'
import type { LeagueTypeId } from '@/lib/league-creation-wizard/types'
import { StepHeader } from './StepHelp'

export type LeagueTypeSelectorProps = {
  sport: string
  value: LeagueTypeId
  onChange: (leagueType: LeagueTypeId) => void
}

const LEAGUE_TYPE_TOOLTIPS: Partial<Record<LeagueTypeId, string>> = {
  redraft: 'One season; redraft every year. Most common.',
  dynasty: 'Keep your full roster year to year; rookie drafts each season.',
  keeper: 'Keep a set number of players each season.',
  best_ball: 'No lineup setting; best scoring lineup counts each week.',
  devy: 'Draft college players (devy) in addition to NFL; NFL/NCAAF only.',
  c2c: 'Campus to Canton: college + NFL in one league; NFL/NCAAF only.',
  guillotine: 'Lowest scorer each week is eliminated.',
  survivor: 'Similar to guillotine; elimination-style.',
  tournament: 'Bracket or tournament format.',
  zombie: 'Eliminated teams can return under certain rules.',
  salary_cap: 'Salary cap and contracts.',
}

/**
 * League type selection (redraft, dynasty, keeper, etc.). Options filtered by sport.
 */
export function LeagueTypeSelector({ sport, value, onChange }: LeagueTypeSelectorProps) {
  const allowed = getAllowedLeagueTypesForSport(sport)
  const safeValue = allowed.includes(value) ? value : allowed[0]!
  return (
    <div className="space-y-5">
      <StepHeader
        title="League type"
        description="Redraft is the most common: one season, then a new draft next year. Dynasty and keeper let you keep players."
        help={
          <>
            <strong>Redraft</strong> — New draft every season. <strong>Dynasty</strong> — Keep full roster; add rookies each year. <strong>Keeper</strong> — Keep a few players. <strong>Devy/C2C</strong> — Include college players (NFL/NCAAF).
          </>
        }
        helpTitle="League type explained"
      />
      <div className="space-y-1.5">
        <Label className="text-white/90">Type</Label>
        <Select value={safeValue} onValueChange={(v) => onChange(v as LeagueTypeId)}>
          <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]" title={LEAGUE_TYPE_TOOLTIPS[safeValue]}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEAGUE_TYPE_IDS.filter((id) => allowed.includes(id)).map((id) => (
              <SelectItem key={id} value={id} title={LEAGUE_TYPE_TOOLTIPS[id]}>
                {LEAGUE_TYPE_LABELS[id]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
