/**
 * POST: Process Survivor official command (vote, play_idol, challenge_pick). PROMPT 349 QA.
 * Body: { command: string, councilId?: string, challengeId?: string }
 * Resolves current user's rosterId; parses command; validates and executes via vote/challenge engines.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft, getCurrentUserRosterIdForLeague } from '@/lib/live-draft-engine/auth'
import { isSurvivorLeague, getSurvivorConfig } from '@/lib/survivor/SurvivorLeagueConfig'
import { parseSurvivorCommand } from '@/lib/survivor/SurvivorCommandParser'
import { submitVote } from '@/lib/survivor/SurvivorVoteEngine'
import { useIdol, getActiveIdolsForRoster } from '@/lib/survivor/SurvivorIdolRegistry'
import { submitChallengeAnswer } from '@/lib/survivor/SurvivorChallengeEngine'
import { getCouncil } from '@/lib/survivor/SurvivorTribalCouncilService'
import { getRosterTeamMap } from '@/lib/zombie/rosterTeamMap'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function resolveRosterIdFromDisplayName(
  leagueId: string,
  displayName: string,
  rosterDisplayNames: Record<string, string>
): string | null {
  const lower = displayName.trim().toLowerCase()
  for (const [rosterId, name] of Object.entries(rosterDisplayNames)) {
    if (name?.toLowerCase() === lower) return rosterId
  }
  return null
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isSurvivor = await isSurvivorLeague(leagueId)
  if (!isSurvivor) return NextResponse.json({ error: 'Not a survivor league' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const rawCommand = typeof body.command === 'string' ? body.command.trim() : ''
  if (!rawCommand) return NextResponse.json({ error: 'command is required' }, { status: 400 })

  const myRosterId = await getCurrentUserRosterIdForLeague(leagueId, userId)
  if (!myRosterId) return NextResponse.json({ error: 'You have no roster in this league' }, { status: 403 })

  const parsed = parseSurvivorCommand(rawCommand)
  if (parsed.intent === 'unknown') {
    return NextResponse.json({ ok: false, error: 'Unknown command. Use @Chimmy vote [manager], @Chimmy play idol [idol], or @Chimmy submit challenge [choice].' }, { status: 400 })
  }

  if (parsed.intent === 'vote') {
    const week = Math.max(1, parseInt(String(body.week ?? 1), 10) || 1)
    const councilId = body.councilId ?? (await getCouncil(leagueId, week))?.id
    if (!councilId) return NextResponse.json({ error: 'No tribal council open for voting' }, { status: 400 })
    const rosters = await prisma.roster.findMany({
      where: { leagueId },
      select: { id: true },
    })
    const map = await getRosterTeamMap(leagueId)
    const teamIds = [...map.rosterIdToTeamId.values()]
    const teams = teamIds.length ? await prisma.leagueTeam.findMany({ where: { id: { in: teamIds } }, select: { id: true, teamName: true } }) : []
    const teamNameById = Object.fromEntries(teams.map((t) => [t.id, t.teamName ?? t.id]))
    const rosterDisplayNames: Record<string, string> = {}
    rosters.forEach((r) => {
      const teamId = map.rosterIdToTeamId.get(r.id)
      rosterDisplayNames[r.id] = teamId ? teamNameById[teamId] ?? r.id : r.id
    })
    const targetRosterId = resolveRosterIdFromDisplayName(leagueId, parsed.targetDisplayName ?? '', rosterDisplayNames)
    if (!targetRosterId) return NextResponse.json({ error: `Could not find manager: ${parsed.targetDisplayName}` }, { status: 400 })
    const result = await submitVote(councilId, myRosterId, targetRosterId)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ ok: true, intent: 'vote', message: 'Vote recorded.' })
  }

  if (parsed.intent === 'play_idol') {
    const activeIdols = await getActiveIdolsForRoster(leagueId, myRosterId)
    const hint = parsed.idolId?.trim().toLowerCase()
    const idol = hint
      ? activeIdols.find((i) => i.id === hint || i.powerType.toLowerCase() === hint)
      : activeIdols[0]
    if (!idol) return NextResponse.json({ error: 'No eligible idol found. Specify idol id or power type, e.g. @Chimmy play idol protect_self' }, { status: 400 })
    const result = await useIdol(leagueId, idol.id, myRosterId)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ ok: true, intent: 'play_idol', message: 'Idol played.' })
  }

  if (parsed.intent === 'challenge_pick') {
    const challengeId = body.challengeId
    if (!challengeId) return NextResponse.json({ error: 'challengeId required for challenge submission' }, { status: 400 })
    const pick = (parsed.payload as { pick?: string })?.pick ?? ''
    if (!pick) return NextResponse.json({ error: 'Challenge pick is required' }, { status: 400 })
    const result = await submitChallengeAnswer(challengeId, myRosterId, null, { pick })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ ok: true, intent: 'challenge_pick', message: 'Challenge submission recorded.' })
  }

  return NextResponse.json({ ok: false, error: 'Command not implemented for this context' }, { status: 400 })
}
