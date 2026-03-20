/**
 * Client-safe config for import provider UI: which providers to show and which are wired end-to-end.
 * Keep in sync with hasFullAdapter() for the single source of truth on backend.
 */

import type { ImportProvider } from './types';

export const IMPORT_PROVIDER_UI_OPTIONS: {
  provider: ImportProvider;
  label: string;
  /** True if preview + create-from-import are implemented. */
  available: boolean;
}[] = [
  { provider: 'sleeper', label: 'Sleeper', available: true },
  { provider: 'espn', label: 'ESPN', available: true },
  { provider: 'yahoo', label: 'Yahoo', available: true },
  { provider: 'fantrax', label: 'Fantrax', available: true },
  { provider: 'mfl', label: 'MyFantasyLeague (MFL)', available: true },
];

export function getImportProviderLabel(provider: ImportProvider): string {
  return IMPORT_PROVIDER_UI_OPTIONS.find((o) => o.provider === provider)?.label ?? provider;
}

export function isImportProviderAvailable(provider: ImportProvider): boolean {
  return IMPORT_PROVIDER_UI_OPTIONS.some((o) => o.provider === provider && o.available);
}
