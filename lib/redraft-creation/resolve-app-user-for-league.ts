/**
 * League.userId must reference app_users.id. Session JWT may rarely drift (e.g. id mismatch);
 * we resolve the canonical AppUser row before any league create.
 */

import { prisma } from '@/lib/prisma'

export type SessionUserLike = {
  id?: string | null
  email?: string | null
}

export type ResolveAppUserForLeagueResult =
  | { ok: true; appUserId: string; resolvedVia: 'id' | 'email_fallback' }
  | { ok: false; reason: 'no_session_user_id' | 'not_found' }

/**
 * 1) Look up by session user id (must equal AppUser.id).
 * 2) If missing, try session email → AppUser.email (case-insensitive) for recovery after migrations.
 */
export async function resolveAppUserIdForLeagueCreate(
  sessionUser: SessionUserLike | null | undefined
): Promise<ResolveAppUserForLeagueResult> {
  const rawId = typeof sessionUser?.id === 'string' ? sessionUser.id.trim() : ''
  if (!rawId) {
    return { ok: false, reason: 'no_session_user_id' }
  }

  const byId = await prisma.appUser.findUnique({
    where: { id: rawId },
    select: { id: true },
  })
  if (byId) {
    return { ok: true, appUserId: byId.id, resolvedVia: 'id' }
  }

  const email = typeof sessionUser?.email === 'string' ? sessionUser.email.trim() : ''
  if (email.includes('@')) {
    const byEmail = await prisma.appUser.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    })
    if (byEmail) {
      return { ok: true, appUserId: byEmail.id, resolvedVia: 'email_fallback' }
    }
  }

  return { ok: false, reason: 'not_found' }
}
