import type { ConnectedAccountsResponse, ProviderStatus } from "./types"
import type { SignInProviderId } from "./types"

/**
 * Fetches connected sign-in provider status for the current user.
 */
export async function getConnectedAccounts(): Promise<ConnectedAccountsResponse> {
  const res = await fetch("/api/user/connected-accounts", { cache: "no-store" })
  if (!res.ok) return { providers: [] }
  const data = await res.json().catch(() => ({}))
  return { providers: data.providers ?? [] }
}

export interface DisconnectConnectedAccountResult {
  ok: boolean
  providers?: ProviderStatus[]
  error?: string
}

/**
 * Disconnects a linked sign-in provider when it is safe.
 */
export async function disconnectConnectedAccount(
  providerId: SignInProviderId
): Promise<DisconnectConnectedAccountResult> {
  const res = await fetch(`/api/user/connected-accounts/${encodeURIComponent(providerId)}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return {
      ok: false,
      error: data?.error ?? "DISCONNECT_FAILED",
    }
  }
  return {
    ok: true,
    providers: data?.providers ?? [],
  }
}
