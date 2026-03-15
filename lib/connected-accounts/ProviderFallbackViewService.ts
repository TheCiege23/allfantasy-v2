import type { SignInProviderId } from "./types"
import { getProviderFallbackMessage } from "./ProviderConnectionResolver"

/**
 * Returns user-facing message when a provider is not configured (for use in settings fallback UI).
 */
export function getFallbackViewMessage(providerId: SignInProviderId): string {
  return getProviderFallbackMessage(providerId)
}

/**
 * Whether the app allows disconnecting this provider (e.g. must keep at least one sign-in method).
 * For now we do not expose disconnect in settings to avoid lockout; document in deliverable.
 */
export function canDisconnectProvider(
  _providerId: SignInProviderId,
  _linkedProvidersCount: number
): boolean {
  return false
}
