'use client';

import { useState } from 'react';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Info } from 'lucide-react';
import { getImportProviderLabel, isImportProviderAvailable } from '@/lib/league-import/provider-ui-config';
import type { ImportProvider } from '@/lib/league-import/types';

export interface ImportSourceInputPanelProps {
  provider: ImportProvider | null;
  /** For available providers: league ID or provider-specific source input. */
  sourceInput: string;
  onSourceInputChange: (value: string) => void;
  onFetchPreview: (sourceOverride?: string) => void;
  loading: boolean;
  disabled?: boolean;
}

const PROVIDER_INPUT_CONFIG: Record<
  string,
  { label: string; placeholder: string; help?: string }
> = {
  sleeper: {
    label: 'Sleeper League ID',
    placeholder: 'e.g. 123456789',
    help: 'Find this in your Sleeper league URL or league settings.',
  },
  espn: {
    label: 'ESPN League ID',
    placeholder: 'e.g. 12345678, 2025:12345678, or a full ESPN league URL',
    help: 'Paste an ESPN league ID or full league URL. Public leagues work directly; private leagues require saved SWID and ESPN_S2 cookies in League Sync first.',
  },
  yahoo: {
    label: 'Yahoo League Key',
    placeholder: 'e.g. 461.l.12345 or 12345',
    help: 'Connect Yahoo in League Sync first, then paste the full Yahoo league key or numeric league ID.',
  },
  fantrax: {
    label: 'Fantrax League ID or URL',
    placeholder: 'e.g. NCAAF:abcdefgh12345678 or a Fantrax league URL',
    help: 'Paste a public Fantrax league URL or ID and choose its sport. REST import currently supports up to 32 teams and requires current roster players. Existing CSV snapshots still accept id:<legacy-uuid>. Review custom rules before creating.',
  },
  mfl: {
    label: 'MFL League ID',
    placeholder: 'e.g. 12345, 2026:12345, or a full MFL league URL',
    help: 'Save your MFL API key in League Sync first, then paste your MFL league ID, season-prefixed ID, or full league URL.',
  },
};

export function ImportSourceInputPanel({
  provider,
  sourceInput,
  onSourceInputChange,
  onFetchPreview,
  loading,
  disabled,
}: ImportSourceInputPanelProps) {
  const [fantraxSport, setFantraxSport] = useState('');
  if (!provider) return null;

  const trimmedSource = sourceInput.trim();
  const fantraxId = provider === 'fantrax'
    ? /^[a-z0-9]{16}$/i.test(trimmedSource)
      ? trimmedSource
      : trimmedSource.match(/\/fantasy\/league\/([a-z0-9]{16})(?:[/?#]|$)/i)?.[1] ?? null
    : null;
  const needsSport = Boolean(fantraxId);
  const available = isImportProviderAvailable(provider);
  const config = PROVIDER_INPUT_CONFIG[provider] ?? {
    label: `${getImportProviderLabel(provider)} ID`,
    placeholder: 'Enter league or connection ID',
  };

  if (!available) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-3 flex items-start gap-2">
        <Info className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
        <div className="text-sm text-white/90">
          <p className="font-medium text-amber-200">Import from {getImportProviderLabel(provider)} is coming soon</p>
          <p className="mt-1 text-white/60">We&apos;re working on it. Use one of the available providers for now, or build a new league manually.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-cyan-300" htmlFor="import-source-input">{config.label}</Label>
      <div className="flex gap-2">
        <Input
          id="import-source-input"
          placeholder={config.placeholder}
          value={sourceInput}
          onChange={(e) => onSourceInputChange(e.target.value)}
          disabled={loading || disabled}
          className="flex-1 border-cyan-400/35 bg-[#030a20]"
        />
        <Button
          type="button"
          onClick={() => {
            const resolved = needsSport && fantraxSport ? `${fantraxSport}:${fantraxId}` : sourceInput;
            if (resolved !== sourceInput) onSourceInputChange(resolved);
            onFetchPreview(resolved);
          }}
          disabled={loading || !sourceInput.trim() || disabled || (needsSport && !fantraxSport)}
          variant="outline"
          className="shrink-0 border-cyan-300/40 text-cyan-200 hover:bg-cyan-300/10"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fetch & Preview'}
        </Button>
      </div>
      {provider === 'fantrax' && needsSport && (
        <div className="space-y-1">
          <Label className="text-xs text-cyan-200" htmlFor="fantrax-import-sport">Fantrax sport</Label>
          <select
            id="fantrax-import-sport"
            value={fantraxSport}
            onChange={(event) => setFantraxSport(event.target.value)}
            disabled={loading || disabled}
            className="block min-h-10 rounded-md border border-cyan-400/35 bg-[#030a20] px-3 text-sm text-white"
          >
            <option value="">Choose the league sport</option>
            {['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'EPL'].map((sport) => (
              <option key={sport} value={sport}>{sport === 'EPL' ? 'Soccer (EPL)' : sport}</option>
            ))}
          </select>
        </div>
      )}
      {config.help && (
        <p className="text-xs text-white/50">{config.help}</p>
      )}
    </div>
  );
}
