/**
 * After OAuth, NextAuth may send users through `redirect` with a `callbackUrl`.
 * These in-app paths must not be collapsed to `/dashboard` (Slice 8 — invite / verify flows).
 */
export function isPostOAuthRedirectPreservedPath(pathname: string): boolean {
  const p = pathname || '/'
  if (p.startsWith('/invite/')) return true
  if (p.startsWith('/join/')) return true
  if (p.startsWith('/verify')) return true
  return false
}
