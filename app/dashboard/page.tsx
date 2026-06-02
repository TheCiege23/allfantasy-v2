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
          <details className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[9999] max-h-[74dvh] overflow-auto rounded-2xl border border-cyan-300/20 bg-[#06111f]/95 text-sm text-neutral-100 shadow-[0_24px_80px_-32px_rgba(34,211,238,0.7)] backdrop-blur-xl sm:left-auto sm:right-4 sm:w-[min(680px,calc(100vw-2rem))]">
            <summary className="group flex cursor-pointer select-none items-center justify-between gap-3 px-4 py-3 text-[0px] font-black uppercase tracking-[0.16em] text-cyan-100/80 marker:text-cyan-200/70">
              <span className="inline-flex min-w-0 items-center gap-2 text-xs">
                <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.9)]" aria-hidden />
                AI Ops Monitor
              </span>
              <span className="rounded-full border border-amber-300/25 bg-amber-300/[0.08] px-2 py-0.5 text-[10px] text-amber-100/75">
                Admin
              </span>
              ⚙ Admin: AI Usage Monitor
            </summary>
            <div className="border-t border-white/10 p-3 sm:p-4">
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
