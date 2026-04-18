/**
 * Pure helpers for orphan / AI-manager roster platformUserId prefixes.
 * Kept prisma-free so client components can import without pulling in lib/prisma.
 */

const ORPHAN_PREFIX = 'orphan-'
const AI_MANAGER_PREFIX = 'ai-manager-'

export function isOrphanPlatformUserId(platformUserId: string): boolean {
  return typeof platformUserId === 'string' && platformUserId.startsWith(ORPHAN_PREFIX)
}

/** Roster slot run by dispersal-draft AI manager flow (not a human user id). */
export function isAiManagerPlatformUserId(platformUserId: string): boolean {
  return typeof platformUserId === 'string' && platformUserId.startsWith(AI_MANAGER_PREFIX)
}
