/**
 * AI host (Chimmy) outbound messages — persisted for posting to chat / approval queue.
 */

import { prisma } from '@/lib/prisma'

export type HostMessageContext = Record<string, unknown>

export async function postHostMessage(
  leagueId: string,
  messageType: string,
  context: HostMessageContext,
  channelType: string,
  tribeId?: string,
  targetUserId?: string,
): Promise<void> {
  const preview =
    typeof context.leagueName === 'string'
      ? String(context.leagueName)
      : `Survivor update (${messageType})`
  const content = `[${messageType}] ${preview}`

  await prisma.survivorHostMessage.create({
    data: {
      leagueId,
      channelType,
      tribeId: tribeId ?? null,
      targetUserId: targetUserId ?? null,
      messageType,
      content,
      isPosted: false,
      requiresApproval: false,
    },
  })
}
