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

  const session = (await getServerSession(authOptions as never)) as {
    user?: {
      id?: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  } | null

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/dashboard')
  }

  const userId = session.user.id

  try {
    const dbUser = await prisma.appUser.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    })

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { discordUserId: true },
    })

    const userImage = resolveDashboardAvatarUrl(session.user.image, dbUser?.avatarUrl)

    return (
      <DashboardShell
        userId={userId}
        userName={session.user.name ?? session.user.email ?? 'Manager'}
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
