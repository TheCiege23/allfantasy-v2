import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { DEFAULT_SIGNUP_TIMEZONE } from '@/lib/signup/timezones'
import { DEFAULT_THEME } from '@/lib/theme/constants'

export async function ensureSharedAccountProfile(input: {
  userId: string
  displayName?: string | null
}): Promise<void> {
  const update = input.displayName ? { displayName: input.displayName } : {}
  try {
    await prisma.userProfile.upsert({
      where: { userId: input.userId },
      update,
      create: {
        userId: input.userId,
        preferredLanguage: 'en',
        timezone: DEFAULT_SIGNUP_TIMEZONE,
        themePreference: DEFAULT_THEME,
        ...(input.displayName ? { displayName: input.displayName } : {}),
      },
    })
  } catch (error) {
    // A page load fires many authenticated requests in parallel; two of them can
    // both miss the row and race the create, tripping the userId unique
    // constraint (P2002). The row now exists, so settle to the intended state
    // with a plain update instead of failing the whole request (which would
    // 500 getServerSession and every API call behind it).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      await prisma.userProfile
        .update({ where: { userId: input.userId }, data: update })
        .catch(() => undefined)
      return
    }
    throw error
  }
}
