/**
 * Private @Chimmy routing — never leaks hidden game state.
 */

import { prisma } from '@/lib/prisma'
const FORBIDDEN =
  "I can't share that — information is currency out here."

export async function handleChimmyPrivateMessage(leagueId: string, userId: string, message: string): Promise<string> {
  const lower = message.toLowerCase()
  const player = await prisma.survivorPlayer.findFirst({ where: { leagueId, userId } })
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { survivorPhase: true },
  })

  if (
    lower.includes('idol') &&
    (lower.includes('other') || lower.includes('anyone') || lower.includes('who has'))
  ) {
    await prisma.survivorHostMessage.create({
      data: {
        leagueId,
        channelType: 'private',
        messageType: 'forbidden_probe',
        content: message.slice(0, 500),
        targetUserId: userId,
        isPosted: false,
      },
    })
    return FORBIDDEN
  }

  if (lower.includes('vote count') || lower.includes('tally')) {
    return FORBIDDEN
  }

  if (lower.startsWith('i vote') || lower.includes('vote for')) {
    return 'Record your vote in the Tribal Council flow when voting is open — roster verification is required for your ballot.'
  }

  if (!player) {
    return 'You are not registered as a Survivor player in this league yet.'
  }

  if (player.playerState === 'eliminated') {
    return 'Your journey on the main island has ended — thanks for playing.'
  }

  if (lower.includes('immunity') && league?.survivorPhase) {
    return `Phase: ${league.survivorPhase}. Public immunity is announced in league chat when results are official.`
  }

  return `I'm here, ${player.displayName}. Ask about rules, deadlines, or your own powers — not others' secrets.`
}
