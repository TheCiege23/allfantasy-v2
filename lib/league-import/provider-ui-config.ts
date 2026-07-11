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
  /** True if the import UI can discover leagues from an account identifier. */
  supportsDiscovery?: boolean;
}[] = [
  { provider: 'sleeper', label: 'Sleeper', available: true, supportsDiscovery: true },
  { provider: 'espn', label: 'ESPN', available: true },
  { provider: 'yahoo', label: 'Yahoo', available: true },
  { provider: 'fantrax', label: 'Fantrax', available: true },
  { provider: 'mfl', label: 'MyFantasyLeague (MFL)', available: true },
  { provider: 'fleaflicker', label: 'Fleaflicker', available: true },
];

export function getImportProviderLabel(provider: ImportProvider): string {
  return IMPORT_PROVIDER_UI_OPTIONS.find((o) => o.provider === provider)?.label ?? provider;
}

export function isImportProviderAvailable(provider: ImportProvider): boolean {
  return IMPORT_PROVIDER_UI_OPTIONS.some((o) => o.provider === provider && o.available);
}

export function supportsImportProviderDiscovery(provider: ImportProvider): boolean {
  return IMPORT_PROVIDER_UI_OPTIONS.some(
    (o) => o.provider === provider && o.available && o.supportsDiscovery === true,
  );
}
