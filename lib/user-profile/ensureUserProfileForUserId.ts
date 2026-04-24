import 'server-only'

import { prisma } from '@/lib/prisma'
import { ensureSharedAccountProfile } from '@/lib/auth/SharedAccountBootstrapService'

/**
 * Guarantees a `UserProfile` row exists for the given AppUser (Neon/Prisma).
 * Used by user APIs so missing profiles (legacy paths, rare races) never cause P2025 on update.
 */
export async function ensureUserProfileForUserId(userId: string): Promise<void> {
  if (!userId) return
  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { id: true, displayName: true, username: true },
  })
  if (!user) return
  await ensureSharedAccountProfile({
    userId: user.id,
    displayName: user.displayName ?? user.username ?? null,
  })
}
