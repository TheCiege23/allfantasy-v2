import type { LegacyProviderId } from "./types"
import type { LegacyImportStatusResponse } from "./types"

const LEGACY_PROVIDER_NAMES: Record<LegacyProviderId, string> = {
  sleeper: "Sleeper",
  yahoo: "Yahoo",
  espn: "ESPN",
  mfl: "MFL",
  fleaflicker: "Fleaflicker",
  fantrax: "Fantrax",
}

export function getLegacyProviderName(providerId: LegacyProviderId): string {
  return LEGACY_PROVIDER_NAMES[providerId] ?? providerId
}

export const LEGACY_PROVIDER_IDS: LegacyProviderId[] = [
  "sleeper",
  "yahoo",
  "espn",
  "mfl",
  "fleaflicker",
  "fantrax",
]

/**
 * Returns human-readable import status for display.
 */
export function getImportStatusLabel(status: string | null): string {
  if (!status) return "—"
  switch (status) {
    case "completed":
      return "Completed"
    case "running":
      return "Importing…"
    case "queued":
      return "Queued"
    case "failed":
    case "error":
      return "Failed"
    case "not_started":
    case "none":
      return "Not started"
    default:
      return status
  }
}

/**
 * Resolves provider status from API response.
 */
export function getProviderStatus(
  data: LegacyImportStatusResponse,
  providerId: LegacyProviderId
) {
  return data.providers[providerId] ?? {
    linked: false,
    importStatus: null,
    available: false,
  }
}
