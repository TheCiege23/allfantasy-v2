import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveDashboardAvatarUrl } from '@/lib/dashboard/resolve-dashboard-avatar'
import { resolveDisplayName } from '@/lib/dashboard/resolve-display-name'
import DashboardUnavailableState from '@/components/dashboard/DashboardUnavailableState'
import {
  createDashboardRuntimeIssue,
  getDashboardMissingEnvVars,
  getDashboardRuntimeIssue,
} from '@/lib/dashboard/runtime-issues'
import { isAppRouterRedirectError } from '@/lib/next/is-app-router-redirect-error'
import { getDashboardLeagueListForUser } from '@/lib/dashboard/get-dashboard-league-list'
import { fetchUserRankJsonForDashboardSSR } from '@/lib/dashboard/fetch-user-rank-ssr'
import { isAdminEmailAllowed } from '@/lib/adminAuth'
import { getAiUsageReport } from '@/lib/ai/aiUsageMonitor'
import { AiUsageMonitorPanel } from '@/components/admin/AiUsageMonitorPanel'
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

  const isAdmin = isAdminEmailAllowed(sessionUser?.email)

  try {
    const [dbUser, userProfile, initialLeagueList, initialUserRankPayload, adminReport] = await Promise.all([
      prisma.appUser
        .findUnique({
          where: { id: userId },
          select: { avatarUrl: true, emailVerified: true, username: true },
        })
        .catch((err: unknown) => {
          console.error('[dashboard] appUser lookup failed:', err)
          return null
        }),
      prisma.userProfile
        .findUnique({
          where: { userId },
          select: { discordUserId: true, displayName: true },
        })
        .catch((err: unknown) => {
          console.error('[dashboard] userProfile lookup failed:', err)
          return null
        }),
      getDashboardLeagueListForUser(userId).catch((err: unknown) => {
        console.error('[dashboard] league list prefetch failed:', err)
        return null
      }),
      fetchUserRankJsonForDashboardSSR().catch((err: unknown) => {
        console.error('[dashboard] user rank prefetch failed:', err)
        return null
      }),
      isAdmin ? getAiUsageReport().catch(() => null) : Promise.resolve(null),
    ])

    const userImage = resolveDashboardAvatarUrl(sessionUser.image, dbUser?.avatarUrl ?? undefined)
    const userName = resolveDisplayName({
      displayName: userProfile?.displayName,
      username: dbUser?.username,
      sessionName: sessionUser.name,
      email: sessionUser.email,
    })

    return (
      <>
        {adminReport && (
          <details className="fixed bottom-4 right-4 z-[9999] max-h-[80vh] w-[680px] overflow-auto rounded-lg border border-neutral-700 bg-neutral-900 text-sm text-neutral-100 shadow-2xl">
            <summary className="cursor-pointer select-none px-4 py-2 font-mono text-xs text-neutral-400 hover:text-neutral-200">
              ⚙ Admin: AI Usage Monitor
            </summary>
            <div className="p-4">
              <AiUsageMonitorPanel report={adminReport} />
            </div>
          </details>
        )}
        <DashboardShell
          userId={userId}
          userName={userName}
          userImage={userImage}
          emailVerified={Boolean(dbUser?.emailVerified)}
          discordConnected={Boolean(userProfile?.discordUserId)}
          initialLeagueList={initialLeagueList ?? undefined}
          initialUserRankPayload={initialUserRankPayload ?? undefined}
        />
      </>
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
