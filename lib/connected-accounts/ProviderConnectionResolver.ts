import type { SignInProviderId } from "./types"

/**
 * Resolves connect action for a provider: signIn(providerId) when configured, else show fallback.
 */
export function getProviderConnectAction(providerId: SignInProviderId, configured: boolean): "connect" | "fallback" {
  if (configured) return "connect"
  return "fallback"
}

const FALLBACK_MESSAGES: Record<SignInProviderId, string> = {
  google: "Google sign-in is not configured for this environment. It will appear when enabled.",
  apple: "Apple sign-in is not configured for this environment. It will appear when enabled.",
  facebook: "Facebook sign-in is planned. Follow updates for when it's available.",
  instagram: "Instagram sign-in is planned. Follow updates for when it's available.",
  x: "X (Twitter) sign-in is planned. Follow updates for when it's available.",
  tiktok: "TikTok sign-in is planned. Follow updates for when it's available.",
}

export function getProviderFallbackMessage(providerId: SignInProviderId): string {
  return FALLBACK_MESSAGES[providerId] ?? "This sign-in option is coming soon."
}
