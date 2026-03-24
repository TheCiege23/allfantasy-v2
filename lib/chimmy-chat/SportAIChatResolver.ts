import {
  DEFAULT_SPORT,
  SUPPORTED_SPORTS,
  isSupportedSport,
  normalizeToSupportedSport,
  type SupportedSport,
} from "@/lib/sport-scope"

/**
 * Normalize AI chat sport context to the supported platform sport set.
 */
export function resolveSportForAIChat(
  rawSport?: string | null,
  fallbackSport?: string | null
): SupportedSport {
  if (typeof rawSport === "string" && rawSport.trim()) {
    return normalizeToSupportedSport(rawSport) as SupportedSport
  }
  if (typeof fallbackSport === "string" && fallbackSport.trim()) {
    return normalizeToSupportedSport(fallbackSport) as SupportedSport
  }
  return DEFAULT_SPORT as SupportedSport
}

export function isValidAISport(sport?: string | null): sport is SupportedSport {
  return typeof sport === "string" && isSupportedSport(sport)
}

export const SUPPORTED_AI_SPORTS = SUPPORTED_SPORTS
