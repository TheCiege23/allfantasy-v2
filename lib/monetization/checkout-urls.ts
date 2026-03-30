export function resolveSafeReturnPath(input: unknown, fallbackPath = "/pricing"): string {
  if (typeof input !== "string") return fallbackPath
  const trimmed = input.trim()
  if (!trimmed.startsWith("/")) return fallbackPath
  if (trimmed.startsWith("//")) return fallbackPath
  if (trimmed.includes("\n") || trimmed.includes("\r")) return fallbackPath
  return trimmed
}

export function withQueryParam(path: string, key: string, value: string): string {
  const url = new URL(path, "https://allfantasy.local")
  url.searchParams.set(key, value)
  return `${url.pathname}${url.search}${url.hash}`
}

export function buildCheckoutReturnUrls(baseUrl: string, returnPath: string): {
  successUrl: string
  cancelUrl: string
} {
  const successPath = withQueryParam(returnPath, "checkout", "success")
  const cancelPath = withQueryParam(returnPath, "checkout", "cancelled")
  return {
    successUrl: `${baseUrl}${successPath}`,
    cancelUrl: `${baseUrl}${cancelPath}`,
  }
}
