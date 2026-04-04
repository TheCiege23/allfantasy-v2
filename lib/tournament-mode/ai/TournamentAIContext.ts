/**
 * Build deterministic context strings for Tournament AI (commissioner, announcer, storytelling, etc.).
 * Used by the tournament AI API route to supply only calculated data to the LLM.
 */

import { prisma } from '@/lib/prisma'
import { getUniversalStandings } from '../TournamentStandingsService'
import {
  getAdvancementSlotsPerConference,
  getBubbleSlotsPerConference,
} from '../advancement-rules'

export async function buildTournamentAIContext(
  tournamentId: string,
  purpose: 'commissioner' | 'announcement' | 'recap' | 'standings' | 'bracket' | 'draft_prep'
): Promise<string> {
  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    include: { conferences: { orderBy: { orderIndex: 'asc' } }, rounds: { orderBy: { roundIndex: 'asc' } } },
  })
  if (!tournament) return ''

  const settings = (tournament.settings as Record<string, unknown>) ?? {}
  const poolSize = Number(settings.participantPoolSize) || 120
  const qualificationWeeks = Number(settings.qualificationWeeks) ?? 9
  const bubbleEnabled = Boolean(settings.bubbleWeekEnabled)
  const advancementPerConf = getAdvancementSlotsPerConference(poolSize)
  const bubbleSlots = getBubbleSlotsPerConference(advancementPerConf, bubbleEnabled)

  const lines: string[] = [
    `Tournament: ${tournament.name}. Sport: ${tournament.sport}. Status: ${tournament.status}.`,
    `Participant pool: ${poolSize}. Qualification weeks: 1-${qualificationWeeks}.`,
    `Advancement: top ${advancementPerConf} per conference. Bubble: ${bubbleEnabled ? `up to ${bubbleSlots} more per conference` : 'disabled'}.`,
    `Conferences: ${tournament.conferences.map((c) => c.name).join(', ')}.`,
    `Rounds: ${tournament.rounds.map((r) => `Round ${r.roundIndex} ${r.name ?? r.phase} (${r.status}, weeks ${r.startWeek ?? '?'}-${r.endWeek ?? '?'})`).join('; ')}.`,
  ]

  if (purpose === 'standings' || purpose === 'recap' || purpose === 'announcement') {
    try {
      const standings = await getUniversalStandings(tournamentId)
      const byConf = new Map<string, typeof standings>()
      for (const r of standings) {
        const list = byConf.get(r.conferenceName) ?? []
        list.push(r)
        byConf.set(r.conferenceName, list)
      }
      lines.push('Standings (deterministic):')
      for (const [confName, list] of byConf) {
        const top = list.slice(0, 15)
        lines.push(`  ${confName}: ${top.map((r) => `#${r.rankInConference} W${r.wins}-L${r.losses} PF${r.pointsFor.toFixed(0)} (${r.advancementStatus ?? '?'})`).join('; ')}`)
      }
      lines.push(`Cut line: rank in conference <= ${advancementPerConf} advances. Bubble zone: ranks ${advancementPerConf + 1} to ${advancementPerConf + bubbleSlots}.`)
    } catch {
      lines.push('Standings: (unavailable)')
    }
  }

  if (purpose === 'bracket' || purpose === 'announcement') {
    const leagues = await prisma.legacyTournamentLeague.findMany({
      where: { tournamentId },
      include: { league: { select: { id: true, name: true } }, conference: { select: { name: true } } },
      orderBy: [{ roundIndex: 'asc' }, { conferenceId: 'asc' }],
    })
    lines.push('Leagues by round:')
    const byRound = new Map<number, typeof leagues>()
    for (const tl of leagues) {
      const list = byRound.get(tl.roundIndex) ?? []
      list.push(tl)
      byRound.set(tl.roundIndex, list)
    }
    for (const [ri, list] of byRound) {
      lines.push(`  Round ${ri}: ${list.map((tl) => `${tl.conference.name} ${tl.league.name}`).join(', ')}`)
    }
  }

  if (purpose === 'draft_prep') {
    const roundRosters = (settings.benchSpotsQualification as number) ?? 7
    const elimRosters = (settings.benchSpotsElimination as number) ?? 2
    lines.push(`Roster rules: qualification ${roundRosters} bench; elimination ${elimRosters} bench. FAAB reset by round: ${settings.faabResetByRound ?? true}.`)
  }

  const participants = await prisma.legacyTournamentParticipant.findMany({
    where: { tournamentId },
    select: { status: true, eliminatedAtRoundIndex: true },
  })
  const active = participants.filter((p) => p.status === 'active').length
  const eliminated = participants.filter((p) => p.status === 'eliminated').length
  lines.push(`Participants: ${active} active, ${eliminated} eliminated.`)

  return lines.join('\n')
}
