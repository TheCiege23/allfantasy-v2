import { prisma } from '@/lib/prisma'

export type Platform = 'sleeper' | 'yahoo' | 'mfl' | 'fantrax' | 'espn'

export async function upsertPlatformIdentity(params: {
  afUserId:         string
  platform:         Platform
  platformUserId:   string
  platformUsername: string
  displayName?:     string
  avatarUrl?:       string
  sport?:           string
}) {
  const { afUserId, platform, platformUserId,
          platformUsername, displayName, avatarUrl, sport } = params

  const existing = await prisma.platformIdentity.findFirst({
    where: { platform, platformUserId }
  })

  if (existing) {
    return prisma.platformIdentity.update({
      where: { id: existing.id },
      data: {
        platformUsername,
        displayName:  displayName ?? platformUsername,
        avatarUrl:    avatarUrl ?? existing.avatarUrl,
        lastSyncedAt: new Date(),
      }
    })
  }

  return prisma.platformIdentity.create({
    data: {
      userId:          afUserId,
      platform,
      platformUserId,
      platformUsername,
      displayName:     displayName ?? platformUsername,
      avatarUrl,
      sport:           sport ?? 'nfl',
      firstImportAt:   new Date(),
      lastSyncedAt:    new Date(),
    }
  })
}

export async function isPlatformRankLocked(
  afUserId: string,
  platform: Platform
): Promise<boolean> {
  const identity = await prisma.platformIdentity.findFirst({
    where: { userId: afUserId, platform }
  })
  return identity?.rankLocked ?? false
}

export async function lockPlatformRank(
  afUserId: string,
  platform: Platform
): Promise<void> {
  await prisma.platformIdentity.updateMany({
    where: { userId: afUserId, platform },
    data:  { rankLocked: true },
  })
}

export async function findAfUserByPlatformId(
  platform: Platform,
  platformUserId: string
): Promise<string | null> {
  const identity = await prisma.platformIdentity.findFirst({
    where: { platform, platformUserId }
  })
  return identity?.userId ?? null
}
