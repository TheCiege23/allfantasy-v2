import { prisma } from '@/lib/prisma'
import { DEFAULT_SIGNUP_TIMEZONE } from '@/lib/signup/timezones'
import { DEFAULT_THEME } from '@/lib/theme/constants'

export async function ensureSharedAccountProfile(input: {
  userId: string
  displayName?: string | null
}): Promise<void> {
  await prisma.userProfile.upsert({
    where: { userId: input.userId },
    update: input.displayName
      ? { displayName: input.displayName }
      : {},
    create: {
      userId: input.userId,
      preferredLanguage: 'en',
      timezone: DEFAULT_SIGNUP_TIMEZONE,
      themePreference: DEFAULT_THEME,
      ...(input.displayName ? { displayName: input.displayName } : {}),
    },
  })
}
