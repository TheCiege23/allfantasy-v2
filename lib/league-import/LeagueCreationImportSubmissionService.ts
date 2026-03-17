/**
 * Client-side service for league creation import: preview fetch and create-from-import submit.
 * Provider-ready: Sleeper wired; other providers return errors for graceful UX.
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

/**
 * Fetch import preview for the given provider and source input.
 * Only Sleeper is implemented; others return { ok: false, error: '...' }.
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

  if (provider === 'sleeper') {
    try {
      const res = await fetch('/api/leagues/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'sleeper', sourceId: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error ?? 'Failed to load league', status: res.status };
      }
      return { ok: true, data };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Network error';
      return { ok: false, error: message };
    }
  }

  return { ok: false, error: `Import from ${provider} is not yet available.` };
}

/**
 * Submit create-from-import for the given provider and source input.
 * Only Sleeper is implemented; others return { ok: false, error: '...' }.
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

  if (provider === 'sleeper') {
    try {
      const res = await fetch('/api/leagues/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'sleeper', sourceId: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error: data.error ?? 'Failed to create league',
          status: res.status,
        };
      }
      return { ok: true, data };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Network error';
      return { ok: false, error: message };
    }
  }

  return { ok: false, error: `Import from ${provider} is not yet available.` };
}
