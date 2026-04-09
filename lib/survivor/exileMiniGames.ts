/**
 * Exile Island Mini-Games — random bonus token opportunities.
 *
 * Mini-games appear RANDOMLY (not on a set schedule) for exile players.
 * Commissioner CANNOT participate unless voted off the main island.
 * Types: pick predictions, over/under, stat challenges, trivia.
 */

import { prisma } from '@/lib/prisma'
import { canCommissionerPlayExileMiniGame } from './commissionerBlindMode'
import { logAuditEntry } from './auditFramework'

export interface ExileMiniGame {
  id: string
  leagueId: string
  week: number
  type: ExileMiniGameType
  title: string
  description: string
  correctAnswer?: string
  reward: number // tokens
  deadline: Date
  status: 'open' | 'closed' | 'resolved'
}

export type ExileMiniGameType =
  | 'win_prediction'
  | 'over_under'
  | 'stat_challenge'
  | 'trivia'
  | 'closest_score'
  | 'first_scorer'

const MINI_GAME_TEMPLATES: Array<{
  type: ExileMiniGameType
  title: string
  descriptionTemplate: string
  reward: number
}> = [
  { type: 'win_prediction', title: 'Win Predictor', descriptionTemplate: 'Pick the winner of today\'s marquee matchup.', reward: 1 },
  { type: 'over_under', title: 'Over/Under Challenge', descriptionTemplate: 'Will the combined score go over or under the line?', reward: 1 },
  { type: 'stat_challenge', title: 'Stat Master', descriptionTemplate: 'Which player will have more yards/points/goals this week?', reward: 1 },
  { type: 'trivia', title: 'Fantasy Trivia', descriptionTemplate: 'Answer this fantasy sports trivia question correctly.', reward: 1 },
  { type: 'closest_score', title: 'Closest Score', descriptionTemplate: 'Predict the exact combined score of the featured game.', reward: 2 },
  { type: 'first_scorer', title: 'First Scorer', descriptionTemplate: 'Who will score first in the featured matchup?', reward: 1 },
]

/**
 * Randomly decide if an exile mini-game should trigger this automation cycle.
 * Probability: ~30% chance per automation run (runs hourly).
 * Result: at most 2-3 mini-games per week for daily sports, ~1 for weekly.
 */
export function shouldTriggerExileMiniGame(weekStructure: 'weekly' | 'daily' | 'weekend_heavy'): boolean {
  const rand = Math.random()
  if (weekStructure === 'daily') return rand < 0.15      // ~15% per hour = ~2-3/week
  if (weekStructure === 'weekend_heavy') return rand < 0.08 // ~8% = ~1/week
  return rand < 0.06                                       // ~6% = ~1/week for NFL
}

/**
 * Create a random exile mini-game.
 */
export async function createExileMiniGame(
  leagueId: string,
  week: number,
  sport: string,
): Promise<string | null> {
  // Check: don't create if one is already open
  const openGame = await (prisma as any).survivorChallenge.findFirst({
    where: { leagueId, week, scope: 'exile', status: 'open' },
  })
  if (openGame) return null

  // Pick random template
  const template = MINI_GAME_TEMPLATES[Math.floor(Math.random() * MINI_GAME_TEMPLATES.length)]!

  const deadline = new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours from now

  const game = await (prisma as any).survivorChallenge.create({
    data: {
      leagueId,
      week,
      challengeType: template.type,
      type: template.type,
      title: `Exile: ${template.title}`,
      description: template.descriptionTemplate,
      scope: 'exile',
      submissionMode: 'private',
      lockAt: deadline,
      locksAt: deadline,
      status: 'open',
      rewardType: 'token',
      rewardAmount: template.reward,
      rewardDetails: { tokenReward: template.reward, exileOnly: true },
    },
  })

  // Post announcement to exile chat
  const exileChannel = await (prisma as any).survivorChatChannel.findFirst({
    where: { leagueId, channelType: 'exile' },
  })
  if (exileChannel) {
    await (prisma as any).survivorChatMessage.create({
      data: {
        leagueId,
        channelId: exileChannel.id,
        channelType: 'exile',
        senderUserId: 'system',
        senderName: '@Chimmy',
        senderIsHost: true,
        isSystemMessage: true,
        content: `**EXILE MINI-GAME: ${template.title}**\n\n${template.descriptionTemplate}\n\nReward: ${template.reward} token(s)\nDeadline: ${deadline.toLocaleString()}\n\nSubmit your answer via @Chimmy or the Challenges screen.`,
        contentType: 'card',
        cardData: { type: 'exile_minigame', challengeId: game.id, reward: template.reward },
      },
    })
  }

  await logAuditEntry({
    leagueId,
    week,
    category: 'challenge',
    action: 'challenge_created',
    data: { challengeId: game.id, type: template.type, scope: 'exile', random: true },
  })

  return game.id
}

/**
 * Submit an exile mini-game answer. Validates commissioner eligibility.
 */
export async function submitExileMiniGameAnswer(
  leagueId: string,
  challengeId: string,
  userId: string,
  answer: unknown,
): Promise<{ ok: boolean; message: string }> {
  // Check commissioner eligibility
  const canPlay = await canCommissionerPlayExileMiniGame(leagueId, userId)
  if (!canPlay) {
    return { ok: false, message: 'Commissioners cannot participate in exile mini-games unless voted off the main island.' }
  }

  // Check if player is on exile
  const player = await (prisma as any).survivorPlayer.findFirst({
    where: { leagueId, userId },
    select: { playerState: true },
  })
  if (!player || player.playerState !== 'exile') {
    return { ok: false, message: 'Only exiled players can participate in exile mini-games.' }
  }

  // Check challenge is still open
  const challenge = await (prisma as any).survivorChallenge.findUnique({
    where: { id: challengeId },
  })
  if (!challenge || challenge.status !== 'open') {
    return { ok: false, message: 'This mini-game is no longer accepting answers.' }
  }
  if (challenge.scope !== 'exile') {
    return { ok: false, message: 'This is not an exile mini-game.' }
  }

  // Check duplicate
  const existing = await (prisma as any).survivorChallengeSubmission.findFirst({
    where: { challengeId, userId },
  })
  if (existing) {
    return { ok: false, message: 'You already submitted an answer for this mini-game.' }
  }

  await (prisma as any).survivorChallengeSubmission.create({
    data: {
      challengeId,
      leagueId,
      userId,
      submission: answer as object,
      isLocked: true,
      submittedAt: new Date(),
    },
  })

  return { ok: true, message: 'Your answer has been submitted! Results will be posted when the mini-game closes.' }
}
