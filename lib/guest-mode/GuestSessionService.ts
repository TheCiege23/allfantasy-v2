/**
 * Guest Session Service — "Continue as Guest"
 *
 * Allows new users to explore AllFantasy without creating an account.
 * Drives engagement by letting them:
 * - Browse mock drafts
 * - Try the trade analyzer (limited)
 * - View sample league dashboards
 * - Experience Chimmy AI (limited queries)
 * - See rankings and projections
 *
 * Guest sessions are ephemeral — data is not persisted long-term.
 * Prompts to create account when they try to:
 * - Join a league
 * - Create a league
 * - Save settings
 * - Use premium AI features
 */

export type GuestSession = {
  guestId: string
  createdAt: number
  expiresAt: number
  mockDraftsJoined: number
  tradeAnalyzesUsed: number
  chimmyQueriesUsed: number
  pagesViewed: string[]
}

const GUEST_LIMITS = {
  maxMockDrafts: 3,
  maxTradeAnalyzes: 5,
  maxChimmyQueries: 10,
  sessionDurationMs: 24 * 60 * 60 * 1000, // 24 hours
}

/**
 * Create a new guest session (stored in localStorage).
 */
export function createGuestSession(): GuestSession {
  const session: GuestSession = {
    guestId: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    expiresAt: Date.now() + GUEST_LIMITS.sessionDurationMs,
    mockDraftsJoined: 0,
    tradeAnalyzesUsed: 0,
    chimmyQueriesUsed: 0,
    pagesViewed: [],
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('af_guest_session', JSON.stringify(session))
  }

  return session
}

/**
 * Get the current guest session.
 */
export function getGuestSession(): GuestSession | null {
  if (typeof window === 'undefined') return null

  const raw = localStorage.getItem('af_guest_session')
  if (!raw) return null

  try {
    const session = JSON.parse(raw) as GuestSession
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem('af_guest_session')
      return null
    }
    return session
  } catch {
    return null
  }
}

/**
 * Check if a guest action is allowed within limits.
 */
export function canGuestPerformAction(
  action: 'mock_draft' | 'trade_analyze' | 'chimmy_query',
): { allowed: boolean; reason: string; remainingUses: number } {
  const session = getGuestSession()
  if (!session) return { allowed: false, reason: 'No guest session', remainingUses: 0 }

  switch (action) {
    case 'mock_draft': {
      const remaining = GUEST_LIMITS.maxMockDrafts - session.mockDraftsJoined
      return remaining > 0
        ? { allowed: true, reason: '', remainingUses: remaining }
        : { allowed: false, reason: 'Sign up to join more mock drafts', remainingUses: 0 }
    }
    case 'trade_analyze': {
      const remaining = GUEST_LIMITS.maxTradeAnalyzes - session.tradeAnalyzesUsed
      return remaining > 0
        ? { allowed: true, reason: '', remainingUses: remaining }
        : { allowed: false, reason: 'Sign up for unlimited trade analysis', remainingUses: 0 }
    }
    case 'chimmy_query': {
      const remaining = GUEST_LIMITS.maxChimmyQueries - session.chimmyQueriesUsed
      return remaining > 0
        ? { allowed: true, reason: '', remainingUses: remaining }
        : { allowed: false, reason: 'Sign up to unlock full Chimmy access', remainingUses: 0 }
    }
  }
}

/**
 * Record a guest action usage.
 */
export function recordGuestAction(action: 'mock_draft' | 'trade_analyze' | 'chimmy_query'): void {
  const session = getGuestSession()
  if (!session) return

  if (action === 'mock_draft') session.mockDraftsJoined++
  else if (action === 'trade_analyze') session.tradeAnalyzesUsed++
  else if (action === 'chimmy_query') session.chimmyQueriesUsed++

  if (typeof window !== 'undefined') {
    localStorage.setItem('af_guest_session', JSON.stringify(session))
  }
}

/**
 * Track a page view for guest engagement analytics.
 */
export function trackGuestPageView(page: string): void {
  const session = getGuestSession()
  if (!session) return

  if (!session.pagesViewed.includes(page)) {
    session.pagesViewed.push(page)
    if (typeof window !== 'undefined') {
      localStorage.setItem('af_guest_session', JSON.stringify(session))
    }
  }
}

/**
 * Get features available to guests.
 */
export function getGuestFeatures(): Array<{
  id: string
  label: string
  available: boolean
  limit: string
}> {
  return [
    { id: 'browse_leagues', label: 'Browse Leagues', available: true, limit: 'View only' },
    { id: 'mock_drafts', label: 'Mock Drafts', available: true, limit: `${GUEST_LIMITS.maxMockDrafts} total` },
    { id: 'trade_analyzer', label: 'Trade Analyzer', available: true, limit: `${GUEST_LIMITS.maxTradeAnalyzes} analyses` },
    { id: 'chimmy_chat', label: 'Ask Chimmy', available: true, limit: `${GUEST_LIMITS.maxChimmyQueries} questions` },
    { id: 'rankings', label: 'View Rankings', available: true, limit: 'Read only' },
    { id: 'projections', label: 'Player Projections', available: true, limit: 'Read only' },
    { id: 'create_league', label: 'Create League', available: false, limit: 'Sign up required' },
    { id: 'join_league', label: 'Join League', available: false, limit: 'Sign up required' },
    { id: 'ai_pro_features', label: 'AI Pro Features', available: false, limit: 'Subscription required' },
  ]
}

/**
 * Clear guest session (on sign-up or manual clear).
 */
export function clearGuestSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('af_guest_session')
  }
}
