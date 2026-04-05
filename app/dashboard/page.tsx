import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveDashboardAvatarUrl } from '@/lib/dashboard/resolve-dashboard-avatar'
import DashboardUnavailableState from '@/components/dashboard/DashboardUnavailableState'
import {
  createDashboardRuntimeIssue,
  getDashboardMissingEnvVars,
  getDashboardRuntimeIssue,
} from '@/lib/dashboard/runtime-issues'
import { isAppRouterRedirectError } from '@/lib/next/is-app-router-redirect-error'
import { DashboardShell } from './DashboardShell'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const missingEnvVars = getDashboardMissingEnvVars()
  if (missingEnvVars.length > 0) {
    const issue = createDashboardRuntimeIssue(missingEnvVars)
    return (
      <DashboardUnavailableState
        title={issue.title}
        message={issue.message}
        missing={issue.missing}
      />
    )
  }

  let session: {
    user?: {
      id?: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  } | null
  try {
    session = (await getServerSession(authOptions as never)) as typeof session
  } catch (error) {
    console.error('[dashboard] getServerSession failed:', error)
    return (
      <DashboardUnavailableState
        title="Dashboard temporarily unavailable"
        message="We couldn't verify your session. Please sign in again or try again in a moment."
      />
    )
  }

  const sessionUser = session?.user
  const rawUserId = typeof sessionUser?.id === 'string' ? sessionUser.id.trim() : ''
  if (!sessionUser || !rawUserId) {
    redirect('/login?callbackUrl=/dashboard')
  }
  const userId = rawUserId

  try {
    const [dbUser, userProfile] = await Promise.all([
      prisma.appUser
        .findUnique({
          where: { id: userId },
          select: { avatarUrl: true },
        })
        .catch((err: unknown) => {
          console.error('[dashboard] appUser lookup failed:', err)
          return null
        }),
      prisma.userProfile
        .findUnique({
          where: { userId },
          select: { discordUserId: true },
        })
        .catch((err: unknown) => {
          console.error('[dashboard] userProfile lookup failed:', err)
          return null
        }),
    ])

    const userImage = resolveDashboardAvatarUrl(sessionUser.image, dbUser?.avatarUrl ?? undefined)

    return (
      <DashboardShell
        userId={userId}
        userName={sessionUser.name ?? sessionUser.email ?? 'Manager'}
        userImage={userImage}
        discordConnected={Boolean(userProfile?.discordUserId)}
      />
    )
  } catch (error) {
    if (isAppRouterRedirectError(error)) {
      throw error
    }

    const issue = getDashboardRuntimeIssue(error)
    if (issue) {
      return (
        <DashboardUnavailableState
          title={issue.title}
          message={issue.message}
          missing={issue.missing}
        />
      )
    }

    console.error('[dashboard] data load failed:', error)

    return (
      <DashboardUnavailableState
        title="Dashboard temporarily unavailable"
        message="We couldn't load your dashboard. Please try again in a moment."
      />
    )
  }
}
