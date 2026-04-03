import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLeagueDrafts, getLeagueInfo, getLeagueUsers } from '@/lib/sleeper-client'
import { resolveDashboardAvatarUrl } from '@/lib/dashboard/resolve-dashboard-avatar'
import { LeagueShell } from './LeagueShell'

export const dynamic = 'force-dynamic'

export default async function LeaguePage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string; name?: string | null; email?: string | null; image?: string | null }
  } | null

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/league/${leagueId}`)}`)
  }

  const userId = session.user.id

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
  const isCommissioner = isOwner || userTeam?.role === 'commissioner'
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

  const dbUser = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  })
  const userImage = resolveDashboardAvatarUrl(session.user.image, dbUser?.avatarUrl)

  const userProfile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { sleeperUserId: true, discordUserId: true },
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

  return (
    <LeagueShell
      league={league}
      userTeam={userTeam}
      isOwner={isOwner}
      isCommissioner={isCommissioner}
      allLeagues={allLeagues}
      userId={userId}
      userName={session.user.name ?? session.user.email ?? 'Manager'}
      userImage={userImage}
      draftDateIso={draftDateIso}
      sleeperCommissionerId={sleeperCommissionerId}
      sleeperUsersByPlatformId={sleeperUsersByPlatformId}
      currentSleeperUserId={currentSleeperUserId}
      discordConnected={Boolean(userProfile?.discordUserId)}
    />
  )
}
