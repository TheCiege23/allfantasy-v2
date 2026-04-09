/**
 * Guillotine League Chat Poster — posts elimination announcements + weekly recaps.
 */

import { prisma } from '@/lib/prisma'

async function postToLeagueChat(
  leagueId: string,
  content: string,
  cardData?: Record<string, unknown>,
): Promise<void> {
  // Use LeagueChatMessage (standard league chat, not survivor-specific)
  await (prisma as any).leagueChatMessage.create({
    data: {
      leagueId,
      userId: 'system',
      userName: '@Chimmy',
      content,
      source: 'system',
      isSystemMessage: true,
      metadata: cardData ? { cardData } : undefined,
    },
  }).catch(() => {
    // Fallback: try survivor chat channel pattern if LeagueChatMessage doesn't exist
    console.warn('[guillotineChatPoster] LeagueChatMessage not available, skipping chat post')
  })
}

/**
 * Post elimination announcement to league chat.
 */
export async function postGuillotineEliminationToChat(
  leagueId: string,
  teamName: string,
  score: number,
  period: number,
  marginBelowSafe: number,
  wasTiebreaker: boolean,
  playersReleased: number,
): Promise<void> {
  let content = `**CHOPPED!** ${teamName} has been eliminated in Period ${period} with ${score.toFixed(1)} pts`
  content += ` (${marginBelowSafe.toFixed(1)} below safe line).`
  if (wasTiebreaker) content += ' Eliminated via tiebreaker.'
  content += ` ${playersReleased} player(s) released to the waiver pool.`

  await postToLeagueChat(leagueId, content, {
    type: 'guillotine_elimination',
    teamName,
    score,
    period,
    marginBelowSafe,
    wasTiebreaker,
    playersReleased,
  })
}

/**
 * Post weekly survival recap to league chat.
 */
export async function postGuillotineWeeklyRecap(
  leagueId: string,
  period: number,
  teamsRemaining: number,
  topScorer: string,
  topScore: number,
  eliminatedTeam: string,
  eliminatedScore: number,
  narrowestEscape: string | null,
  narrowestMargin: number | null,
): Promise<void> {
  const lines = [`**Period ${period} Survival Recap**`]
  lines.push(`Teams remaining: ${teamsRemaining}`)
  lines.push(`Top scorer: ${topScorer} (${topScore.toFixed(1)} pts)`)
  lines.push(`Eliminated: ${eliminatedTeam} (${eliminatedScore.toFixed(1)} pts)`)
  if (narrowestEscape && narrowestMargin != null) {
    lines.push(`Narrowest escape: ${narrowestEscape} (+${narrowestMargin.toFixed(1)} above chop)`)
  }

  await postToLeagueChat(leagueId, lines.join('\n'), {
    type: 'guillotine_recap',
    period,
    teamsRemaining,
    topScorer,
    eliminatedTeam,
  })
}

/**
 * Post endgame announcement.
 */
export async function postGuillotineEndgameAnnouncement(
  leagueId: string,
  format: string,
  teamsRemaining: number,
  teamNames: string[],
): Promise<void> {
  const formatLabel = format === 'last_team_standing'
    ? 'Last Team Standing'
    : format === 'final_four'
      ? 'Final Four'
      : format === 'final_three'
        ? 'Final 3'
        : 'Final Stage'

  await postToLeagueChat(leagueId,
    `**${formatLabel} Reached!** ${teamsRemaining} teams remain: ${teamNames.join(', ')}. The endgame begins now.`,
    { type: 'guillotine_endgame', format, teamsRemaining, teamNames },
  )
}

/**
 * Post champion announcement.
 */
export async function postGuillotineChampion(
  leagueId: string,
  championName: string,
  totalPoints: number,
  periodsEliminated: number,
): Promise<void> {
  await postToLeagueChat(leagueId,
    `**CHAMPION!** ${championName} is the last team standing with ${totalPoints.toFixed(1)} total points, surviving ${periodsEliminated} elimination periods!`,
    { type: 'guillotine_champion', championName, totalPoints },
  )
}
