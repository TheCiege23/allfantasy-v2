import { prisma } from '@/lib/prisma'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'
import type { NextResponse } from 'next/server'

export async function submitConfessional(
  leagueId: string,
  userId: string,
  text: string,
): Promise<void | NextResponse> {
  const gate = await requireAfSub()
  if (typeof gate !== 'string') return gate
  await prisma.survivorHostMessage.create({
    data: {
      leagueId,
      channelType: 'private',
      messageType: 'confessional',
      content: text.slice(0, 8000),
      targetUserId: userId,
      isPosted: false,
      requiresApproval: true,
    },
  })
}

export async function generateConfessionalHighlights(leagueId: string): Promise<string | NextResponse> {
  const gate = await requireAfSub()
  if (typeof gate !== 'string') return gate
  return 'Confessional highlights — generate after season opt-in review.'
}
