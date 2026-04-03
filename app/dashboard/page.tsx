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

  try {
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

    const dbUser = await prisma.appUser.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    })

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      select: { discordUserId: true },
    })

    const userImage = resolveDashboardAvatarUrl(session.user.image, dbUser?.avatarUrl)

    return (
      <DashboardShell
        userId={session.user.id}
        userName={session.user.name ?? session.user.email ?? 'Manager'}
        userImage={userImage}
        discordConnected={Boolean(userProfile?.discordUserId)}
      />
    )
  } catch (error) {
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

    throw error
  }
}
