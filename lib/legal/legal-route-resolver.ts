/**
 * Resolves legal page back links and signup-return URLs.
 */
export function getSignupReturnUrl(next?: string | null): string {
  const path = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : ""
  return path ? `/signup?next=${encodeURIComponent(path)}` : "/signup"
}

export function getDisclaimerUrl(fromSignup?: boolean, next?: string | null): string {
  const params = new URLSearchParams()
  if (fromSignup) params.set("from", "signup")
  if (next && next.startsWith("/") && !next.startsWith("//")) params.set("next", next)
  const q = params.toString()
  return q ? `/disclaimer?${q}` : "/disclaimer"
}

export function getTermsUrl(fromSignup?: boolean, next?: string | null): string {
  const params = new URLSearchParams()
  if (fromSignup) params.set("from", "signup")
  if (next && next.startsWith("/") && !next.startsWith("//")) params.set("next", next)
  const q = params.toString()
  return q ? `/terms?${q}` : "/terms"
}

export function getPrivacyUrl(fromSignup?: boolean, next?: string | null): string {
  const params = new URLSearchParams()
  if (fromSignup) params.set("from", "signup")
  if (next && next.startsWith("/") && !next.startsWith("//")) params.set("next", next)
  const q = params.toString()
  return q ? `/privacy?${q}` : "/privacy"
}

export function getDataDeletionUrl(fromSignup?: boolean, next?: string | null): string {
  const params = new URLSearchParams()
  if (fromSignup) params.set("from", "signup")
  if (next && next.startsWith("/") && !next.startsWith("//")) params.set("next", next)
  const q = params.toString()
  return q ? `/data-deletion?${q}` : "/data-deletion"
}
