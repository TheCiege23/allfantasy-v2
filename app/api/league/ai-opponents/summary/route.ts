import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { assertLeagueMember } from "@/lib/league/league-access"
import { prisma } from "@/lib/prisma"
import { getAiOpponentsSettings } from "@/lib/ai/opponents/leagueSettings"
import { listDraftRosterIdsForAiManagedTeams, resolveDraftRosterIdForLeagueTeam } from "@/lib/ai/opponents/draftRosterMapping"
import { getPersonalityForArchetype } from "@/lib/ai/opponents/botPersonality"

export const dynamic = "force-dynamic"

/**
 * League members: which draft slot roster IDs are AI-managed (Prisma AI opponents).
 * Merge client-side with commissioner draft AI assignments.
 */
export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const leagueId = req.nextUrl.searchParams.get("leagueId")?.trim()
  if (!leagueId) return NextResponse.json({ error: "leagueId required" }, { status: 400 })

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: gate.status === 404 ? "League not found" : "Forbidden" }, { status: gate.status })

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  const settings = getAiOpponentsSettings(league?.settings)

  const assignments = await prisma.aiOpponentTeamAssignment.findMany({
    where: { leagueId, paused: false },
    select: {
      id: true,
      leagueTeamId: true,
      thinkSpeed: true,
      isTakeover: true,
      profile: { select: { displayName: true, archetypeId: true, botId: true } },
    },
  })

  const aiManagedDraftRosterIds = settings.enabled ? await listDraftRosterIdsForAiManagedTeams(leagueId) : []

  const enriched = await Promise.all(
    assignments.map(async (a) => {
      const draftRosterId = await resolveDraftRosterIdForLeagueTeam(leagueId, a.leagueTeamId)
      const personality = getPersonalityForArchetype(a.profile.archetypeId)
      return {
        assignmentId: a.id,
        leagueTeamId: a.leagueTeamId,
        draftRosterId,
        thinkSpeed: a.thinkSpeed,
        isTakeover: a.isTakeover,
        displayName: a.profile.displayName,
        archetypeId: a.profile.archetypeId,
        archetypeLabel: personality.label,
        botId: a.profile.botId,
      }
    }),
  )

  return NextResponse.json({
    enabled: Boolean(settings.enabled),
    aiManagedDraftRosterIds,
    assignments: enriched,
  })
}
