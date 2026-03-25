import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { requireVerifiedSession } from "@/lib/require-verified"
import { getEntryBracketData } from "@/lib/brackets/getEntryBracketData"
import { LeagueHomeTabs } from "@/components/bracket/LeagueHomeTabs"
import BracketShell from "@/components/bracket/BracketShell"
import BracketLeagueSummaryCards from "@/components/bracket/BracketLeagueSummaryCards"
import { LeagueCreatorBadge } from "@/components/creator/LeagueCreatorBadge"
import { DiscoveryViewTracker } from "@/components/discovery/DiscoveryViewTracker"
import { Settings, ArrowLeft } from "lucide-react"
import { resolveBracketChallengeLabel, resolveBracketSportUI } from "@/lib/bracket-challenge"

export default async function LeagueDetailPage({
  params,
}: {
  params: { leagueId: string }
}) {
  const { userId } = await requireVerifiedSession()

  const league = await (prisma as any).bracketLeague.findUnique({
    where: { id: params.leagueId },
    include: {
      tournament: { select: { id: true, name: true, season: true, sport: true, lockAt: true } },
      owner: { select: { id: true, displayName: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, displayName: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      entries: {
        include: {
          user: { select: { id: true, displayName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!league) notFound()

  const isMember = league.members.some((m: any) => m.userId === userId)
  if (!isMember) {
    return (
      <div className="mode-surface mode-readable min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="mode-muted">You&apos;re not a member of this pool.</p>
          <Link href="/brackets" className="text-sm hover:underline" style={{ color: "var(--accent)" }}>
            Back to Bracket Challenges
          </Link>
        </div>
      </div>
    )
  }

  const userEntries = league.entries.filter((e: any) => e.userId === userId)

  const allPicksByEntry: Record<string, Record<string, string | null>> = {}
  let nodesWithGame: any[] = []

  const pickVisibility = (league.scoringRules as any)?.pickVisibility || "visible"
  const isLocked = league.tournament?.lockAt ? new Date(league.tournament.lockAt) <= new Date() : false
  const hideOtherPicks = pickVisibility === "hidden_until_lock" && !isLocked

  if (league.entries.length > 0) {
    const primaryEntry = userEntries[0] ?? league.entries[0]
    const bracketData = await getEntryBracketData(league.tournament.id, primaryEntry.id)
    nodesWithGame = bracketData.nodesWithGame
    allPicksByEntry[primaryEntry.id] = bracketData.pickMap

    const remainingEntries = league.entries.filter((e: any) => e.id !== primaryEntry.id)
    for (const entry of remainingEntries) {
      if (hideOtherPicks && entry.userId !== userId) {
        allPicksByEntry[entry.id] = {}
        continue
      }
      const picks = await prisma.bracketPick.findMany({
        where: { entryId: entry.id },
        select: { nodeId: true, pickedTeamName: true },
      })
      const pickMap: Record<string, string | null> = {}
      for (const p of picks) pickMap[p.nodeId] = p.pickedTeamName ?? null
      allPicksByEntry[entry.id] = pickMap
    }
  } else {
    const nodes = await prisma.bracketNode.findMany({
      where: { tournamentId: league.tournament.id },
      orderBy: [{ round: "asc" }, { region: "asc" }, { slot: "asc" }],
    })
    nodesWithGame = nodes.map((n) => ({
      ...n,
      game: null,
    }))
  }

  const rules = (league.scoringRules || {}) as any
  const scoringMode = String(rules.scoringMode || 'standard')
  const sportUI = resolveBracketSportUI(league.tournament?.sport ?? null)
  const challengeLabel = resolveBracketChallengeLabel({
    bracketType: rules?.bracketType,
    challengeType: rules?.challengeType,
    sport: league.tournament?.sport,
  })

  return (
    <div className="mode-surface mode-readable min-h-screen">
      <DiscoveryViewTracker
        leagueId={league.id}
        source="bracket"
        leagueName={league.name}
        sport={league.tournament?.sport ?? undefined}
      />
      <BracketShell>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Link
              href="/brackets"
              className="inline-flex items-center justify-center w-8 h-8 rounded-full transition"
              style={{ background: "color-mix(in srgb, var(--panel2) 88%, transparent)", color: "var(--muted)" }}
              data-testid="bracket-league-back-button"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)" }}>
                <span className="text-[10px] font-bold" style={{ color: "var(--accent)" }}>{sportUI.badge}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold truncate">
                  {league.name}
                </h1>
                <div className="flex items-center gap-1.5 text-[11px] mode-muted">
                  <span>{challengeLabel}</span>
                  <span>·</span>
                  <span>{league.tournament?.season}</span>
                </div>
                <LeagueCreatorBadge leagueId={league.id} />
              </div>
            </div>
            <button type="button" className="p-2 rounded-full transition mode-muted" aria-label="League settings (coming soon)">
              <Settings className="w-5 h-5" />
            </button>
          </div>

          <BracketLeagueSummaryCards
            memberCount={league.members.length}
            entryCount={league.entries.length}
            lockAt={league.tournament?.lockAt}
          />

          <LeagueHomeTabs
            leagueId={league.id}
            tournamentId={league.tournament.id}
            currentUserId={userId}
            isOwner={league.ownerId === userId}
            members={league.members}
            entries={league.entries}
            userEntries={userEntries}
            nodes={nodesWithGame}
            initialPicks={allPicksByEntry}
            joinCode={league.joinCode}
            maxManagers={league.maxManagers}
            scoringMode={scoringMode}
            scoringRules={rules}
          />
        </div>
      </BracketShell>
    </div>
  )
}

