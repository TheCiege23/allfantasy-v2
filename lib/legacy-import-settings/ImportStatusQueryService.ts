import type { LegacyProviderId } from "./types"
import type { LegacyImportStatusResponse } from "./types"
import type { LegacyProviderStatus } from "./types"

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

export function isImportStatusActive(status: string | null): boolean {
  return status === "running" || status === "queued"
}

export function shouldShowRetryImport(status: LegacyProviderStatus | null | undefined): boolean {
  const value = status?.importStatus ?? null
  return value === "failed" || value === "error"
}

export function getLegacyProviderHelpHref(providerId: LegacyProviderId): string {
  if (providerId === "sleeper") return "/import"
  return "/import"
}

export function getLegacyProviderPrimaryAction(params: {
  providerId: LegacyProviderId
  status: LegacyProviderStatus | null
}): { label: string; href: string } | null {
  const { providerId, status } = params
  if (!status) return null
  if (!status.available) return null

  if (providerId === "sleeper") {
    if (!status.linked) {
      return { label: "Connect first", href: "/dashboard" }
    }
    if (shouldShowRetryImport(status)) {
      return { label: "Retry import", href: "/af-legacy?retry=1&provider=sleeper" }
    }
    if (status.importStatus === "completed" || isImportStatusActive(status.importStatus)) {
      return { label: "Re-import / refresh", href: "/af-legacy?refresh=1&provider=sleeper" }
    }
    return { label: "Start import", href: "/af-legacy?provider=sleeper" }
  }

  if (!status.linked) {
    return { label: "Connect first", href: "/dashboard" }
  }
  if (shouldShowRetryImport(status)) {
    return { label: "Retry import", href: "/af-legacy?retry=1&provider=" + providerId }
  }
  return { label: "Open import", href: "/af-legacy?provider=" + providerId }
}
