import type { LegacyImportStatusResponse } from "./types"

/**
 * Fetches legacy import status for the current user (Sleeper link + job status; others placeholder).
 */
export async function getLegacyImportStatus(): Promise<LegacyImportStatusResponse> {
  const res = await fetch("/api/user/legacy-import-status", { cache: "no-store" })
  if (!res.ok) return { sleeperUsername: null, providers: {} }
  const data = await res.json().catch(() => ({}))
  return {
    sleeperUsername: data.sleeperUsername ?? null,
    providers: data.providers ?? {},
  }
}

/**
 * Explicit refresh helper for settings UI actions.
 */
export async function refreshLegacyImportStatus(): Promise<LegacyImportStatusResponse> {
  return getLegacyImportStatus()
}
