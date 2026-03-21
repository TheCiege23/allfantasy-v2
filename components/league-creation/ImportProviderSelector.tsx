'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IMPORT_PROVIDER_UI_OPTIONS } from '@/lib/league-import/provider-ui-config';
import type { ImportProvider } from '@/lib/league-import/types';

export interface ImportProviderSelectorProps {
  value: ImportProvider | null;
  onChange: (provider: ImportProvider | null) => void;
  disabled?: boolean;
}

export function ImportProviderSelector({
  value,
  onChange,
  disabled,
}: ImportProviderSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Import from</Label>
      <Select
        value={value ?? ''}
        onValueChange={(v) => onChange((v || null) as ImportProvider | null)}
        disabled={disabled}
      >
        <SelectTrigger
          className="bg-gray-900 border-purple-600/40"
          aria-label="Import provider"
        >
          <SelectValue placeholder="Select platform" />
        </SelectTrigger>
        <SelectContent>
          {IMPORT_PROVIDER_UI_OPTIONS.map((opt) => (
            <SelectItem
              key={opt.provider}
              value={opt.provider}
              disabled={!opt.available}
            >
              {opt.label}
              {!opt.available && ' (coming soon)'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
