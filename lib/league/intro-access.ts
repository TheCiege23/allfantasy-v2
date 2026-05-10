import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isAdminEmailAllowed, isAdminRole } from '@/lib/adminAuth'

type IntroAccessOptions = {
  leagueId: string
  userId: string
  role?: string | null
  email?: string | null
}

/**
 * Intro routes are available to league members/commissioners and platform admins.
 * Uses the existing draft-access helper for league-level membership checks.
 */
export async function canAccessLeagueIntro(options: IntroAccessOptions): Promise<boolean> {
  const { leagueId, userId, role, email } = options
  if (!leagueId || !userId) return false

  if (isAdminRole(role) || isAdminEmailAllowed(email)) return true
  return canAccessLeagueDraft(leagueId, userId)
}
