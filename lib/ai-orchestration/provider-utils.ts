/**
 * PROMPT 152 — Shared provider adapter utilities.
 * Sanitize errors (no secrets in logs or responses); normalize malformed output.
 */

/** Redact potential secret patterns from error messages. Never log or return raw API keys. */
export function sanitizeProviderError(message: string | undefined): string {
  if (message == null || typeof message !== 'string') return 'Provider error'
  const s = message.slice(0, 500).trim()
  if (!s) return 'Provider error'
  // Redact patterns that might look like keys/tokens
  const redacted = s
    .replace(/\b(sk-[a-zA-Z0-9-_]{20,})/gi, '[REDACTED]')
    .replace(/\b(api[_-]?key|apikey)\s*[:=]\s*["']?[^"'\s]+/gi, 'api_key=[REDACTED]')
  return redacted || 'Provider error'
}

/** Treat empty or whitespace-only text as invalid for synthesis. */
export function isMeaningfulText(text: string | undefined): boolean {
  return typeof text === 'string' && text.trim().length > 0
}
