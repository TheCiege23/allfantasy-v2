import type { ConnectedAccountsResponse, ProviderStatus } from "./types"

/**
 * Fetches connected sign-in provider status for the current user.
 */
export async function getConnectedAccounts(): Promise<ConnectedAccountsResponse> {
  const res = await fetch("/api/user/connected-accounts", { cache: "no-store" })
  if (!res.ok) return { providers: [] }
  const data = await res.json().catch(() => ({}))
  return { providers: data.providers ?? [] }
}
