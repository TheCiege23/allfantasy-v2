/**
 * Client-side service for league creation import: preview fetch and create-from-import submit.
 */

import { isImportProviderAvailable } from './provider-ui-config';
import type { ImportProvider } from './types';

export interface FetchPreviewResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  status?: number;
}

export interface SubmitImportResult {
  ok: boolean;
  data?: { league: { id: string; name: string; sport: string } };
  error?: string;
  status?: number;
}

function getImportApiErrorMessage(
  data: { error?: string } | null | undefined,
  fallback: string
): string {
  if (data?.error === 'VERIFICATION_REQUIRED') return 'Verify your email or phone before importing a league.';
  if (data?.error === 'AGE_REQUIRED') return 'Confirm that you are 18+ before importing a league.';
  if (data?.error === 'UNAUTHENTICATED' || data?.error === 'Unauthorized') return 'Sign in to import a league.';
  if (data?.error?.includes('Connect Yahoo')) return 'Connect Yahoo in League Sync before importing from Yahoo.';
  if (data?.error?.includes('Connect ESPN')) return 'Connect ESPN in League Sync before importing private ESPN leagues.';
  if (data?.error?.includes('saved ESPN cookies')) return 'Reconnect ESPN in League Sync, then try importing again.';
  if (data?.error?.includes('MFL API key')) return 'Save your MFL API key in League Sync before importing from MyFantasyLeague.';
  return data?.error ?? fallback;
}

/**
 * Fetch import preview for the given provider and source input.
 */
export async function fetchImportPreview(
  provider: ImportProvider,
  sourceInput: string
): Promise<FetchPreviewResult> {
  if (!isImportProviderAvailable(provider)) {
    return { ok: false, error: `Import from ${provider} is not yet available.` };
  }
  const trimmed = sourceInput?.trim();
  if (!trimmed) {
    return { ok: false, error: 'League ID is required.' };
  }

  try {
    const res = await fetch('/api/leagues/import/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, sourceId: trimmed }),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        error: getImportApiErrorMessage(data, 'Failed to load league'),
        status: res.status,
      };
    }
    return { ok: true, data };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network error';
    return { ok: false, error: message };
  }
}

/**
 * Submit create-from-import for the given provider and source input.
 */
export async function submitImportCreation(
  provider: ImportProvider,
  sourceInput: string,
  userId: string
): Promise<SubmitImportResult> {
  if (!isImportProviderAvailable(provider)) {
    return { ok: false, error: `Import from ${provider} is not yet available.` };
  }
  const trimmed = sourceInput?.trim();
  if (!trimmed) {
    return { ok: false, error: 'League ID is required.' };
  }

  try {
    const res = await fetch('/api/leagues/import/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, sourceId: trimmed }),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        error: getImportApiErrorMessage(data, 'Failed to create league'),
        status: res.status,
      };
    }
    return { ok: true, data };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network error';
    return { ok: false, error: message };
  }
}
