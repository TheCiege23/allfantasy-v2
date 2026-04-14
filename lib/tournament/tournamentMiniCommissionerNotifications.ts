import { prisma } from '@/lib/prisma'

export async function notifyUserPlatform(
  userId: string,
  type: string,
  title: string,
  body: string,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.platformNotification.create({
      data: {
        userId,
        type,
        title,
        body,
        productType: 'shared',
        severity: 'low',
        meta: meta ?? {},
      },
    })
  } catch (e) {
    console.warn('[tournamentMiniCommissionerNotifications] notify failed', e)
  }
}
