import type { SignInProviderId } from "./types"
import type { ProviderStatus } from "./types"
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
  provider: ProviderStatus,
  linkedProvidersCount: number,
  hasPassword: boolean
): boolean {
  if (!provider.linked) return false
  if (linkedProvidersCount > 1) return true
  return hasPassword
}

export function getDisconnectBlockedMessage(providerId: SignInProviderId): string {
  const label = providerId === "x" ? "X (Twitter)" : providerId.charAt(0).toUpperCase() + providerId.slice(1)
  return `You cannot disconnect ${label} yet because it is your only sign-in method. Add another provider or set a password first.`
}
