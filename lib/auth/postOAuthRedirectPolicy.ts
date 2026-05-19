/**
 * After OAuth, NextAuth may send users through `redirect` with a `callbackUrl`.
 * These in-app paths must not be collapsed to `/dashboard` (Slice 8 — invite / verify flows).
 * Also preserves settings paths so Connect Google from the settings page lands correctly.
 */
export function isPostOAuthRedirectPreservedPath(pathname: string): boolean {
  const p = pathname || '/'
  if (p.startsWith('/invite/')) return true
  if (p.startsWith('/join/')) return true
  if (p.startsWith('/verify')) return true
  if (p === '/settings' || p.startsWith('/settings/')) return true
  if (p === '/profile' || p.startsWith('/profile/')) return true
  return false
}
