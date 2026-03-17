/**
 * Validates a callback URL to prevent open redirect attacks.
 * Only allows internal relative paths starting with /
 *
 * @param callbackUrl - URL to validate (from query param)
 * @returns Valid internal path or "/dashboard" as fallback
 */
export function validateCallbackUrl(callbackUrl?: string | null): string {
  if (!callbackUrl || typeof callbackUrl !== "string") {
    return "/dashboard"
  }

  // Reject absolute URLs (http://, https://) and protocol-relative URLs (//)
  if (/^(https?:)?\/\//.test(callbackUrl)) {
    console.warn("[Security] Rejected absolute or protocol-relative URL in callbackUrl:", callbackUrl)
    return "/dashboard"
  }

  // Allow only relative paths starting with /
  if (!callbackUrl.startsWith("/")) {
    console.warn("[Security] Rejected path not starting with / in callbackUrl:", callbackUrl)
    return "/dashboard"
  }

  // Reject dangerous protocols embedded in paths
  if (/^\/*(javascript:|data:)/i.test(callbackUrl)) {
    console.warn("[Security] Rejected dangerous protocol in callbackUrl:", callbackUrl)
    return "/dashboard"
  }

  return callbackUrl
}
