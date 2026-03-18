/**
 * Map errors and HTTP status codes to user-friendly messages.
 * Use from client and server.
 */

export const USER_FRIENDLY_MESSAGES: Record<number, string> = {
  400: "Something wasn't quite right. Please check your input and try again.",
  401: "Please sign in to continue.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you're looking for.",
  408: "The request took too long. Please try again.",
  409: "This conflicts with current data. Refresh and try again.",
  422: "We couldn't process that. Please check the form and try again.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again in a moment.",
  502: "We're temporarily unavailable. Please try again shortly.",
  503: "We're busy at the moment. Please try again in a minute.",
}

const DEFAULT_MESSAGE = "Something went wrong. Please try again."

/**
 * Returns a user-friendly message for an error.
 * Prefers known API error text when safe; otherwise status code or generic message.
 */
export function getErrorMessage(
  error: unknown,
  options?: { context?: string; fallback?: string }
): string {
  const fallback = options?.fallback ?? DEFAULT_MESSAGE

  if (error == null) return fallback

  if (typeof error === "string") {
    const trimmed = error.trim()
    if (trimmed.length > 0 && trimmed.length < 500) return trimmed
    return fallback
  }

  if (error instanceof Error) {
    const msg = error.message?.trim()
    // Avoid exposing raw "GET /api/... failed (500): ..." to users
    if (msg && !msg.startsWith("GET ") && !msg.startsWith("POST ") && !msg.includes("failed (")) {
      if (msg.length < 400) return msg
    }
    // Check for status in message (e.g. "failed (429)")
    const statusMatch = msg?.match(/failed \((\d+)\)/)
    const status = statusMatch ? parseInt(statusMatch[1], 10) : null
    if (status != null && USER_FRIENDLY_MESSAGES[status]) {
      return USER_FRIENDLY_MESSAGES[status]
    }
  }

  const withStatus = error as { status?: number; statusCode?: number }
  const status = withStatus?.status ?? withStatus?.statusCode
  if (typeof status === "number" && USER_FRIENDLY_MESSAGES[status]) {
    return USER_FRIENDLY_MESSAGES[status]
  }

  return fallback
}

/**
 * User-facing message for network/connection failures.
 */
export function getNetworkErrorMessage(): string {
  return "We couldn't reach the server. Check your connection and try again."
}
