import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLeagueRole } from '@/lib/league/permissions'
import { getLeagueDrafts, getLeagueInfo, getLeagueUsers } from '@/lib/sleeper-client'
import { resolveDashboardAvatarUrl } from '@/lib/dashboard/resolve-dashboard-avatar'
import DashboardUnavailableState from '@/components/dashboard/DashboardUnavailableState'
import {
    createDashboardRuntimeIssue,
    getDashboardMissingEnvVars,
    getDashboardRuntimeIssue,
} from '@/lib/dashboard/runtime-issues'
import { isAppRouterRedirectError } from '@/lib/next/is-app-router-redirect-error'
import { LeagueShell } from './LeagueShell'

export const dynamic = 'force-dynamic'

export default async function LeaguePage({
    params,
    searchParams,
}: {
    params: Promise<{ leagueId: string }>
    searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
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

  const { leagueId } = await params
    const sp = searchParams ? await searchParams : {}
        const zc = sp.zombieChimmy
    const zombieChimmyPrefill = typeof zc === 'string' ? zc : Array.isArray(zc) ? zc[0] ?? null : null

  let session: {
        user?: { id?: string; name?: string | null; email?: string | null; image?: string | null }
  } | null
    try {
          session = (await getServerSession(authOptions as never)) as typeof session
    } catch (error) {
          console.error('[league] getServerSession failed:', error)
          return (
                  <DashboardUnavailableState
                            title="League page temporarily unavailable"
                            message="We couldn't verify your session. Please sign in again or try again in a moment."
                          />
                )
    }

  if (!session?.user?.id) {
        redirect(`/login?callbackUrl=${encodeURIComponent(`/league/${leagueId}`)}`)
  }

  const userId = session.user.id

  try {
        const league = await prisma.league.findFirst({
                where: { id: leagueId },
                include: {
                          teams: { orderBy: { externalId: 'asc' } },
                          invites: {
                                      where: { isActive: true },
                                      orderBy: { createdAt: 'desc' },
                                      take: 1,
                          },
                },
        })

      if (!league) {
              redirect('/dashboard')
      }

      const isOwner = league.userId === userId
        const userTeam = league.teams.find((t) => t.claimedByUserId === userId) ?? null
        const role = await getLeagueRole(leagueId, userId)
        const isCommissioner = role === 'commissioner' || role === 'co_commissioner'
        const isHeadCommissioner = role === 'commissioner'

      if (!isOwner && !userTeam) {
              redirect('/dashboard')
      }

      const allLeagues = await prisma.league.findMany({
              where: {
                        OR: [{ userId }, { teams: { some: { claimedByUserId: userId } } }],
              },
              orderBy: { updatedAt: 'desc' },
              take: 50,
      })

      const dbUser = await prisma.appUser
          .findUnique({
                    where: { id: userId },
                    select: { avatarUrl: true },
          })
          .catch((err: unknown) => {
                    console.error('[league] appUser lookup failed:', err)
                    return null
          })

      const userImage = resolveDashboardAvatarUrl(session.user.image, dbUser?.avatarUrl)

      const userProfile = await prisma.userProfile
          .findUnique({
                    where: { userId },
                    select: { sleeperUserId: true, discordUserId: true },
          })
          .catch((err: unknown) => {
                    console.error('[league] userProfile lookup failed:', err)
                    return null
          })

      const currentSleeperUserId = userProfile?.sleeperUserId ?? null

      let sleeperCommissionerId: string | null = null
        let sleeperUsersByPlatformId: Record<string, { display_name: string; avatar: string | null }> = {}
              let draftDateIso: string | null = null

      if (league.platform === 'sleeper' && league.platformLeagueId) {
              type SleeperDraftSummary = { start_time?: number | null }
              const [drafts, sleeperLeague, sleeperUsers] = await Promise.all([
                        getLeagueDrafts(league.platformLeagueId).catch(() => []) as Promise<SleeperDraftSummary[]>,
                        getLeagueInfo(league.platformLeagueId),
                        getLeagueUsers(league.platformLeagueId),
                      ])

          const draft = drafts[0] ?? null
              if (draft?.start_time != null && Number.isFinite(draft.start_time)) {
                        draftDateIso = new Date(draft.start_time).toISOString()
              }

          const comm = sleeperLeague as { commissioner_id?: string } | null
              if (comm?.commissioner_id) {
                        sleeperCommissionerId = String(comm.commissioner_id)
              }

          for (const u of sleeperUsers) {
                    if (u?.user_id) {
                                sleeperUsersByPlatformId[u.user_id] = {
                                              display_name: u.display_name || u.username || 'Manager',
                                              avatar: u.avatar ?? null,
                                }
                    }
          }
      }

      const activeDraft =
              (await prisma.dispersalDraft
                       .findFirst({
                                   where: {
                                                 leagueId,
                                                 status: { in: ['pending', 'configuring', 'in_progress'] },
                                   },
                                   select: { id: true, status: true },
                       })
                       .catch(() => null)) ?? null

      return (
              <div className="flex min-h-0 flex-1 flex-col">
                      <LeagueShell
                                  league={league}
                                  userTeam={userTeam}
                                  isOwner={isOwner}
                                  isCommissioner={isCommissioner}
                                  isHeadCommissioner={isHeadCommissioner}
                                  allLeagues={allLeagues}
                                  userId={userId}
                                  userName={session.user.name ?? session.user.email ?? 'Manager'}
                                  userImage={userImage}
                                  draftDateIso={draftDateIso}
                                  sleeperCommissionerId={sleeperCommissionerId}
                                  sleeperUsersByPlatformId={sleeperUsersByPlatformId}
                                  currentSleeperUserId={currentSleeperUserId}
                                  discordConnected={Boolean(userProfile?.discordUserId)}
                                  zombieChimmyPrefill={zombieChimmyPrefill}
                                  dispersalDraftInProgress={
                                                activeDraft ? { draftId: activeDraft.id, status: activeDraft.status } : null
                                  }
                                />
              </div>div>
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
    
        console.error('[league] data load failed:', error)
              return (
                      <DashboardUnavailableState
                                title="League page temporarily unavailable"
                                message="We couldn't load this league. Please try again in a moment."
                              />
                    )
  }
}</div>
