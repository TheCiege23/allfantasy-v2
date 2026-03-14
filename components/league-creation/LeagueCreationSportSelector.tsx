'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type LeagueSportOption = 'NFL' | 'NBA' | 'MLB' | 'NHL' | 'NCAAF' | 'NCAAB' | 'SOCCER';

const SPORT_LABELS: Record<LeagueSportOption, string> = {
  NFL: 'NFL Football',
  NBA: 'NBA Basketball',
  MLB: 'MLB Baseball',
  NHL: 'NHL Hockey',
  NCAAF: 'NCAA Football',
  NCAAB: 'NCAA Basketball',
  SOCCER: 'Soccer',
};

const LEAGUE_SPORTS: LeagueSportOption[] = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER'];

export interface LeagueCreationSportSelectorProps {
  value: LeagueSportOption;
  onChange: (sport: LeagueSportOption) => void;
  disabled?: boolean;
  showHelper?: boolean;
}

/**
 * Sport selector for league creation. Soccer is its own sport; NFL has presets (e.g. IDP) chosen separately.
 */
export function LeagueCreationSportSelector({
  value,
  onChange,
  disabled = false,
  showHelper = true,
}: LeagueCreationSportSelectorProps) {
  return (
    <div>
      <Label>Sport</Label>
      <Select value={value} onValueChange={(v) => onChange(v as LeagueSportOption)} disabled={disabled}>
        <SelectTrigger className="bg-gray-900 border-purple-600/40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LEAGUE_SPORTS.map((s) => (
            <SelectItem key={s} value={s}>
              {SPORT_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showHelper && (
        <p className="text-white/50 text-xs mt-1">
          Soccer is its own sport with soccer-specific roster and scoring. For NFL, choose a preset (e.g. Standard, PPR, IDP) below.
        </p>
      )}
    </div>
  );
}

export { LEAGUE_SPORTS, SPORT_LABELS };
