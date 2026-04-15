'use client';

import { Label } from '@/components/ui/label';
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
 * NFL: chip-style toggles (Standard, PPR, Half PPR, Superflex, IDP, etc.). Other sports: same pattern when multiple variants exist.
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
      ? 'Tap a preset to load roster and scoring defaults. IDP and Dynasty IDP add defensive players and IDP scoring.'
      : sportUpper === 'SOCCER'
        ? 'Soccer uses its own sport-specific default preset. Changing sports is how you switch between Soccer and NFL-style formats such as IDP.'
        : 'Selecting a preset changes roster and scoring defaults automatically for this sport.';

  const safeValue = variantOptions.some((v) => v.value === value) ? value : variantOptions[0]!.value;

  return (
    <div>
      <Label>{label}</Label>
      <div
        className="mt-2 flex flex-wrap gap-2"
        role="group"
        aria-label={label}
        data-testid="league-creation-preset-selector"
      >
        {variantOptions.map(({ value: v, label: optLabel }) => {
          const selected = safeValue === v;
          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => onChange(v)}
              className={`min-h-[40px] rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                selected
                  ? 'border-cyan-300 bg-cyan-400/15 text-white shadow-[0_0_0_1px_rgba(0,255,220,0.2)_inset]'
                  : 'border-white/15 bg-black/30 text-white/85 hover:bg-white/[0.06]'
              }`}
            >
              {optLabel}
            </button>
          );
        })}
      </div>
      {showHelper && (
        <p className="text-white/50 text-xs mt-2">
          {helperText}
        </p>
      )}
    </div>
  );
}
