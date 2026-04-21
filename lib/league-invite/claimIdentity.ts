import { prisma } from '@/lib/prisma'

export type InviteClaimEligibility = 'claimed' | 'matched' | 'open' | 'locked'

export async function resolveLinkedPlatformUserIds(args: {
  userId: string
  platform: string | null | undefined
}): Promise<Set<string>> {
  const platform = String(args.platform ?? '').toLowerCase().trim()
  const linkedIds = new Set<string>()

  const identities = await prisma.platformIdentity.findMany({
    where: { userId: args.userId, platform },
    select: { platformUserId: true },
  }).catch(() => [])

  for (const identity of identities) {
    const value = identity.platformUserId?.trim()
    if (value) linkedIds.add(value)
  }

  if (platform === 'sleeper') {
    const profile = await prisma.userProfile.findFirst({
      where: { userId: args.userId },
      select: { sleeperUserId: true },
    }).catch(() => null)
    const sleeperUserId = profile?.sleeperUserId?.trim()
    if (sleeperUserId) linkedIds.add(sleeperUserId)
  }

  return linkedIds
}

export function getInviteClaimEligibility(args: {
  linkedPlatformUserIds: Set<string>
  platformUserId: string | null | undefined
  isClaimed: boolean
  isOrphan: boolean
}): InviteClaimEligibility {
  if (args.isClaimed) return 'claimed'

  const platformUserId = typeof args.platformUserId === 'string' ? args.platformUserId.trim() : ''
  if (args.isOrphan || !platformUserId) return 'open'
  if (args.linkedPlatformUserIds.has(platformUserId)) return 'matched'
  return 'locked'
}