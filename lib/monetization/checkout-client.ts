export type MonetizationCheckoutProductType = "subscription" | "token_pack"

type CheckoutEndpoint = "/api/monetization/checkout/subscription" | "/api/monetization/checkout/tokens"

export type MonetizationCheckoutRequest = {
  sku: string
  productType: MonetizationCheckoutProductType
  returnPath: string
}

export type MonetizationCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

const CHECKOUT_TIMEOUT_MS = 12_000
const inFlightCheckoutRequests = new Map<string, Promise<MonetizationCheckoutResult>>()

function resolveCheckoutEndpoint(productType: MonetizationCheckoutProductType): CheckoutEndpoint {
  return productType === "subscription"
    ? "/api/monetization/checkout/subscription"
    : "/api/monetization/checkout/tokens"
}

function normalizeReturnPath(path: string): string {
  const value = String(path ?? "").trim()
  if (!value.startsWith("/")) return "/pricing"
  return value.length > 200 ? value.slice(0, 200) : value
}

export async function resolveCheckoutUrl(
  request: MonetizationCheckoutRequest
): Promise<MonetizationCheckoutResult> {
  const sku = String(request.sku ?? "").trim()
  if (!sku) {
    return { ok: false, error: "Missing checkout sku." }
  }

  const normalizedRequest: MonetizationCheckoutRequest = {
    sku,
    productType: request.productType,
    returnPath: normalizeReturnPath(request.returnPath),
  }
  const endpoint = resolveCheckoutEndpoint(request.productType)
  const requestKey = `${normalizedRequest.productType}:${normalizedRequest.sku}:${normalizedRequest.returnPath}`
  const existing = inFlightCheckoutRequests.get(requestKey)
  if (existing) return existing

  const pending = (async (): Promise<MonetizationCheckoutResult> => {
    const controller = new AbortController()
    const timeoutId = globalThis.setTimeout(() => controller.abort(), CHECKOUT_TIMEOUT_MS)
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sku: normalizedRequest.sku,
          returnPath: normalizedRequest.returnPath,
        }),
        signal: controller.signal,
      })
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!response.ok || !data.url) {
        return {
          ok: false,
          error: data.error ?? "Unable to start checkout. Please try again.",
        }
      }
      return { ok: true, url: data.url }
    } catch {
      return { ok: false, error: "Unable to start checkout. Please try again." }
    } finally {
      globalThis.clearTimeout(timeoutId)
      inFlightCheckoutRequests.delete(requestKey)
    }
  })()

  inFlightCheckoutRequests.set(requestKey, pending)
  return pending
}
