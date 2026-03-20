'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type CreationMode = 'create' | 'import';

export interface LeagueCreationModeSelectorProps {
  value: CreationMode;
  onChange: (mode: CreationMode) => void;
  disabled?: boolean;
}

export function LeagueCreationModeSelector({
  value,
  onChange,
  disabled,
}: LeagueCreationModeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>League creation</Label>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as CreationMode)}
        disabled={disabled}
      >
        <SelectTrigger
          className="bg-gray-900 border-purple-600/40"
          aria-label="League creation mode"
          data-testid="league-creation-mode-select"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="create">Build New League - set sport, scoring, size, and options manually</SelectItem>
          <SelectItem value="import">Import Existing League - import from Sleeper, ESPN, Yahoo, Fantrax, or MFL</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
