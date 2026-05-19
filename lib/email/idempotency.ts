/**
 * Build a safe, deterministic idempotency key for Resend transactional email sends.
 *
 * Rules enforced here:
 *   - Parts contain no PII, raw tokens, or secrets — only opaque DB record IDs,
 *     user IDs (UUIDs/CUIDs), and short semantic prefixes.
 *   - Parts must not contain ":" (it is the separator).
 *   - The result is sliced to 255 chars, which is Resend's maximum key length.
 */
export function buildEmailIdempotencyKey(
  prefix: string,
  ...parts: string[]
): string {
  const key = [prefix, ...parts].join(":")
  // Resend caps idempotency keys at 255 characters.
  return key.slice(0, 255)
}
