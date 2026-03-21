'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LeagueSportOption } from './LeagueCreationSportSelector';

export interface VariantOption {
  value: string;
  label: string;
}

export interface LeagueCreationPresetSelectorProps {
  sport?: LeagueSportOption | string;
  variantOptions: VariantOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  showHelper?: boolean;
}

/**
 * League preset / variant selector.
 * NFL: Standard, PPR, Half PPR, Superflex, IDP, Dynasty IDP. Soccer (and other sports): Standard.
 * IDP is an NFL preset that adds defensive roster slots and scoring; selecting it loads IDP defaults automatically.
 */
export function LeagueCreationPresetSelector({
  sport,
  variantOptions,
  value,
  onChange,
  disabled = false,
  showHelper = true,
}: LeagueCreationPresetSelectorProps) {
  if (variantOptions.length === 0) return null;

  const sportUpper = String(sport ?? '').toUpperCase();
  const label = sportUpper === 'NFL' ? 'NFL preset' : sportUpper === 'SOCCER' ? 'Soccer preset' : 'Preset';
  const helperText =
    sportUpper === 'NFL'
      ? 'Choose an NFL preset to load the right roster and scoring defaults. IDP and Dynasty IDP add defensive players and IDP scoring.'
      : sportUpper === 'SOCCER'
        ? 'Soccer uses its own sport-specific default preset. Changing sports is how you switch between Soccer and NFL-style formats such as IDP.'
        : 'Selecting a preset changes roster and scoring defaults automatically for this sport.';

  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          className="bg-gray-900 border-purple-600/40"
          aria-label={label}
          data-testid="league-creation-preset-selector"
        >
          <SelectValue placeholder="Select preset" />
        </SelectTrigger>
        <SelectContent>
          {variantOptions.map(({ value: v, label }) => (
            <SelectItem key={v} value={v}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showHelper && (
        <p className="text-white/50 text-xs mt-1">
          {helperText}
        </p>
      )}
    </div>
  );
}
