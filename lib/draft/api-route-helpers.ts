import 'server-only'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft, getCurrentUserRosterIdForLeague } from '@/lib/live-draft-engine/auth'
import { resolveLiveDraftContextByDraftId } from './resolve-draft-context'

export async function requireDraftRouteUser() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('Unauthorized')
  }
  return userId
}

export async function requireLiveDraftAccess(draftId: string, userId: string) {
  const context = await resolveLiveDraftContextByDraftId(draftId, userId)
  if (!context) {
    throw new Error('Draft not found')
  }

  const allowed = await canAccessLeagueDraft(context.leagueId, userId)
  if (!allowed) {
    throw new Error('Forbidden')
  }

  const currentUserRosterId = await getCurrentUserRosterIdForLeague(context.leagueId, userId)
  return {
    context,
    currentUserRosterId,
  }
}
