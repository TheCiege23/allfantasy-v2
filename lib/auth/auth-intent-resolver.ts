/**
 * Unified auth intent resolution: where to send the user after login or signup.
 * One account, one session; redirect depends on product intent (next / callbackUrl).
 */

const DEFAULT_AFTER_LOGIN = "/"
const DEFAULT_AFTER_SIGNUP = "/"

/** Safe path: must start with / and not be a full URL (open redirect). */
export function safeRedirectPath(path: string | null | undefined): string {
  if (path == null || typeof path !== "string") return DEFAULT_AFTER_LOGIN
  const trimmed = path.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return DEFAULT_AFTER_LOGIN
  return trimmed
}

/** Resolve redirect after successful login. Prefer callbackUrl, then next. */
export function getRedirectAfterLogin(
  callbackUrl: string | null | undefined,
  next: string | null | undefined
): string {
  return safeRedirectPath(callbackUrl || next || DEFAULT_AFTER_LOGIN)
}

/** Resolve redirect after successful signup (before or after verification). */
export function getRedirectAfterSignup(next: string | null | undefined): string {
  return safeRedirectPath(next || DEFAULT_AFTER_SIGNUP)
}

/** Build login URL with intent preserved for after signup. */
export function loginUrlWithIntent(redirectPath: string): string {
  const safe = safeRedirectPath(redirectPath)
  return `/login?callbackUrl=${encodeURIComponent(safe)}`
}

/** Build signup URL with intent preserved for after signup. */
export function signupUrlWithIntent(redirectPath: string): string {
  const safe = safeRedirectPath(redirectPath)
  return `/signup?next=${encodeURIComponent(safe)}`
}
