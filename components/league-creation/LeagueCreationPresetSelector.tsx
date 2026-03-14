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
 * League preset / variant selector (e.g. NFL: Standard, PPR, Superflex, IDP, Dynasty IDP).
 * IDP is an NFL league type (preset) that adds defensive roster slots and scoring.
 */
export function LeagueCreationPresetSelector({
  variantOptions,
  value,
  onChange,
  disabled = false,
  showHelper = true,
}: LeagueCreationPresetSelectorProps) {
  if (variantOptions.length <= 1) return null;

  return (
    <div>
      <Label>League preset</Label>
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
          Choosing a preset (e.g. IDP, Dynasty IDP) updates roster and scoring defaults automatically.
        </p>
      )}
    </div>
  );
}
