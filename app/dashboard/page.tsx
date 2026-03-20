import { redirect } from "next/navigation"
import DashboardContent from "./DashboardContent"
import DashboardUnavailableState from "@/components/dashboard/DashboardUnavailableState"
import {
  createDashboardRuntimeIssue,
  getDashboardMissingEnvVars,
  getDashboardRuntimeIssue,
} from "@/lib/dashboard/runtime-issues"
import {
  extractLeagueCareerTier,
  isLeagueVisibleForCareerTier,
  resolveUserCareerTier,
} from "@/lib/ranking/tier-visibility"

export const dynamic = "force-dynamic"

async function loadDashboardDependencies() {
  const [{ getServerSession }, { authOptions }, { prisma }, { getChecklistState, getNudges }] =
    await Promise.all([
      import("next-auth"),
      import("@/lib/auth"),
      import("@/lib/prisma"),
      import("@/lib/onboarding-retention"),
    ])

  return {
    getServerSession,
    authOptions,
    prisma,
    getChecklistState,
    getNudges,
  }
}

function resolveAdmin(email: string | null | undefined) {
  if (!email) return false
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
  return allow.includes(email.toLowerCase())
}

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
    const { getServerSession, authOptions, prisma, getChecklistState, getNudges } =
      await loadDashboardDependencies()
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; email?: string | null }
    } | null

    if (!session?.user?.id || !session?.user?.email) {
      redirect("/login?callbackUrl=/dashboard")
    }

    const userId = session.user.id
    const email = session.user.email

    const appUser = await (prisma as any).appUser
      .findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          emailVerified: true,
          avatarUrl: true,
          legacyUser: {
            select: {
              rankCache: {
                select: {
                  careerTier: true,
                },
              },
            },
          },
        },
      })
      .catch(() => null)

    const userCareerTier = await resolveUserCareerTier(prisma as any, userId, 1)

    const profile = await (prisma as any).userProfile
      .findUnique({
        where: { userId },
        select: {
          sleeperUsername: true,
          sleeperUserId: true,
          sleeperLinkedAt: true,
          ageConfirmedAt: true,
          phoneVerifiedAt: true,
          profileComplete: true,
          onboardingStep: true,
          onboardingCompletedAt: true,
        },
      })
      .catch(() => null)

    const leagues = await (prisma as any).bracketLeagueMember
      .findMany({
        where: { userId },
        include: {
          league: {
            select: {
              id: true,
              name: true,
              tournamentId: true,
              joinCode: true,
              scoringRules: true,
              _count: { select: { members: true } },
            },
          },
        },
      })
      .catch(() => [])

    const entriesRaw = await (prisma as any).bracketEntry
      .findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          createdAt: true,
          league: {
            select: { tournamentId: true },
          },
          picks: {
            select: { points: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
      .catch(() => [])

    const entries = entriesRaw.map((e: any) => ({
      id: e.id,
      name: e.name,
      tournamentId: e.league?.tournamentId || "",
      score: (e.picks || []).reduce((sum: number, p: any) => sum + (p.points || 0), 0),
    }))

    const isVerified = !!appUser?.emailVerified || !!profile?.phoneVerifiedAt
    const isAgeConfirmed = !!profile?.ageConfirmedAt
    const isAdmin = resolveAdmin(email)

    const onboardingComplete =
      profile?.onboardingCompletedAt != null ||
      (profile as { onboardingStep?: string } | null)?.onboardingStep === "completed"

    const [checklistState, nudges] = await Promise.all([
      getChecklistState(userId).catch(() => null),
      getNudges(userId).catch(() => []),
    ])

    return (
      <DashboardContent
        onboardingComplete={!!onboardingComplete}
        user={{
          id: appUser?.id || userId,
          username: appUser?.username || null,
          displayName: appUser?.displayName || null,
          email: email,
          emailVerified: !!appUser?.emailVerified,
          avatarUrl: appUser?.avatarUrl || null,
        }}
        profile={{
          sleeperUsername: profile?.sleeperUsername || null,
          isVerified,
          isAgeConfirmed,
          profileComplete: profile?.profileComplete || false,
        }}
        leagues={leagues.map((m: any) => ({
          id: m.league.id,
          name: m.league.name,
          tournamentId: m.league.tournamentId,
          joinCode: m.league.joinCode || null,
          memberCount: m.league._count?.members || 0,
          leagueTier: extractLeagueCareerTier(m.league.scoringRules, userCareerTier),
          inTierRange: isLeagueVisibleForCareerTier(
            userCareerTier,
            extractLeagueCareerTier(m.league.scoringRules, userCareerTier),
            1
          ),
        }))}
        userCareerTier={userCareerTier}
        entries={entries.map((e: any) => ({
          id: e.id,
          name: e.name,
          tournamentId: e.tournamentId,
          score: e.score || 0,
        }))}
        isAdmin={isAdmin}
        checklistState={checklistState}
        retentionNudges={nudges}
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
