const INVITE_TOKEN_KEY = 'af-invite-token-v1'

function randomToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

/**
 * Stable per-browser invite token for share links (landing URL with ?invite=).
 */
export function getOrCreateInviteToken(): string {
  if (typeof window === 'undefined') return ''
  try {
    let t = window.localStorage.getItem(INVITE_TOKEN_KEY)
    if (!t) {
      t = randomToken()
      window.localStorage.setItem(INVITE_TOKEN_KEY, t)
    }
    return t
  } catch {
    return randomToken()
  }
}

export function buildLandingInviteUrl(): string {
  if (typeof window === 'undefined') return ''
  const token = getOrCreateInviteToken()
  if (!token) return window.location.origin + '/'
  const u = new URL('/', window.location.origin)
  u.searchParams.set('invite', token)
  return u.toString()
}
