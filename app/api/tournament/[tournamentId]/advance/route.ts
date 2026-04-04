/**
 * PROMPT 3: Commissioner-only — run qualification advancement (create elimination leagues, assign users).
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runQualificationAdvancement } from '@/lib/tournament-mode/TournamentProgressionService'
import { scheduleRedraftForRound, applyFaabResetForRound, applyBenchSpotsForRound } from '@/lib/tournament-mode/TournamentRedraftService'
import { buildTournamentAIContext } from '@/lib/tournament-mode/ai/TournamentAIContext'
import { generateTournamentAI } from '@/lib/tournament-mode/ai/TournamentAIService'
import { logTournamentAudit } from '@/lib/tournament-mode/TournamentAuditService'
import { onPlayoffDrama } from '@/lib/commentary-engine'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tournamentId } = await params
  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { creatorId: true, settings: true, name: true, sport: true },
  })
  if (!tournament || tournament.creatorId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const result = await runQualificationAdvancement(tournamentId)
    await logTournamentAudit(tournamentId, 'advancement_run', {
      actorId: userId,
      targetType: 'tournament',
      targetId: tournamentId,
      metadata: { advanced: result.advanced, eliminated: result.eliminated, bubbleAdvanced: result.bubbleAdvanced, newLeagueIds: result.newLeagueIds },
    })
    const settings = (tournament.settings as Record<string, unknown>) ?? {}
    const faabBudget = Number(settings.faabBudgetDefault) ?? 100
    const benchSpots = Number(settings.benchSpotsElimination) ?? 2
    await applyFaabResetForRound(tournamentId, 1, faabBudget)
    await applyBenchSpotsForRound(tournamentId, 1, benchSpots)
    const { scheduled, leagueIds } = await scheduleRedraftForRound(tournamentId, 1)

    const staticBody = `Advancement complete. ${result.advanced} teams advanced (${result.bubbleAdvanced} via bubble). ${result.eliminated} eliminated. Redraft scheduled for ${scheduled} new leagues. Draft rooms are now available for each elimination league.`
    let announcementBody = staticBody
    try {
      const ctx = await buildTournamentAIContext(tournamentId, 'announcement')
      const aiResult = await generateTournamentAI('round_announcement', ctx, { announcementType: 'qualification_closes' })
      if (aiResult.ok && aiResult.text) announcementBody = aiResult.text
    } catch {
      // keep static body
    }
    await prisma.legacyTournamentAnnouncement.create({
      data: {
        tournamentId,
        authorId: userId,
        title: 'Qualification complete — Elimination round',
        body: announcementBody,
        type: 'round_start',
        metadata: { roundIndex: 1, newLeagueIds: result.newLeagueIds },
        pinned: true,
      },
    })
    void emitTournamentPlayoffDramaCommentary({
      tournamentName: tournament.name,
      fallbackSport: tournament.sport,
      newLeagueIds: result.newLeagueIds,
      advanced: result.advanced,
      eliminated: result.eliminated,
      bubbleAdvanced: result.bubbleAdvanced,
    })

    return NextResponse.json({
      ok: true,
      advanced: result.advanced,
      eliminated: result.eliminated,
      bubbleAdvanced: result.bubbleAdvanced,
      newLeagueIds: result.newLeagueIds,
      draftSessionsScheduled: scheduled,
      leagueIds,
    })
  } catch (err) {
    console.error('[tournament/advance] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to run advancement' },
      { status: 500 }
    )
  }
}

async function emitTournamentPlayoffDramaCommentary(input: {
  tournamentName: string
  fallbackSport: string
  newLeagueIds: string[]
  advanced: number
  eliminated: number
  bubbleAdvanced: number
}) {
  try {
    if (!input.newLeagueIds.length) return
    const leagues = await prisma.league.findMany({
      where: { id: { in: input.newLeagueIds.slice(0, 3) } },
      select: { id: true, name: true, sport: true },
    })
    const summary = `${input.advanced} teams advanced (${input.bubbleAdvanced} via bubble) and ${input.eliminated} were eliminated as the elimination phase began.`
    for (const league of leagues) {
      await onPlayoffDrama(
        {
          eventType: 'playoff_drama',
          leagueId: league.id,
          sport: normalizeToSupportedSport(league.sport ?? input.fallbackSport),
          leagueName: league.name ?? undefined,
          headline: `${input.tournamentName}: elimination round begins`,
          summary,
          dramaType: 'elimination',
        },
        { skipStats: true, persist: true }
      )
    }
  } catch {
    // non-fatal
  }
}
