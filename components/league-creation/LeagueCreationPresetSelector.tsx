'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface VariantOption {
  value: string;
  label: string;
}

export interface LeagueCreationPresetSelectorProps {
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
  variantOptions,
  value,
  onChange,
  disabled = false,
  showHelper = true,
}: LeagueCreationPresetSelectorProps) {
  if (variantOptions.length === 0) return null;

  return (
    <div>
      <Label>Preset</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="bg-gray-900 border-purple-600/40">
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
          Selecting a preset changes roster and scoring defaults automatically. For NFL, <strong className="text-white/70">IDP</strong> and <strong className="text-white/70">Dynasty IDP</strong> add defensive players and scoring.
        </p>
      )}
    </div>
  );
}
