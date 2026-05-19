/**
 * Canonical username validation — shared across:
 *   - app/api/auth/check-username/route.ts
 *   - lib/user-settings/UserProfileService.ts
 *   - app/choose-username/ChooseUsernameForm.tsx (client-side soft validation)
 *
 * Rules (product policy):
 *   • 3–30 characters
 *   • Lowercase letters, numbers, and underscores only (input auto-normalised)
 *   • Must not look like a phone number (7+ consecutive digits)
 *
 * Note: "@" is already excluded by the character-set rule, so email-like values
 * are blocked implicitly. Profanity and DB uniqueness checks are server-only
 * and applied separately.
 */

export const USERNAME_MIN = 3
export const USERNAME_MAX = 30

/** All characters must be lowercase a–z, 0–9, or underscore. */
const USERNAME_RE = /^[a-z0-9_]+$/

export type UsernameValidationResult =
  | { ok: true; normalized: string }
  | { ok: false; reason: string }

/**
 * Validates and normalises a raw username input.
 * Returns `{ ok: true, normalized }` on success or `{ ok: false, reason }` on failure.
 * Does NOT check profanity or DB uniqueness — apply those separately on the server.
 */
export function validateUsername(raw: string): UsernameValidationResult {
  if (typeof raw !== "string") {
    return { ok: false, reason: "Username is required" }
  }
  const normalized = raw.trim().toLowerCase()
  if (!normalized) {
    return { ok: false, reason: "Username is required" }
  }
  if (normalized.length < USERNAME_MIN) {
    return { ok: false, reason: `Must be at least ${USERNAME_MIN} characters` }
  }
  if (normalized.length > USERNAME_MAX) {
    return { ok: false, reason: `Must be at most ${USERNAME_MAX} characters` }
  }
  if (!USERNAME_RE.test(normalized)) {
    return { ok: false, reason: "Letters, numbers, and underscores only" }
  }
  // Block phone-like values (7+ consecutive digits)
  if (/\d{7,}/.test(normalized)) {
    return { ok: false, reason: "Cannot look like a phone number" }
  }
  return { ok: true, normalized }
}
