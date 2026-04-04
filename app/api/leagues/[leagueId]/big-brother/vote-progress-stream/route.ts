import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isBigBrotherLeague } from '@/lib/big-brother/BigBrotherLeagueConfig'
import { getCurrentCycleForLeague } from '@/lib/big-brother/BigBrotherPhaseStateMachine'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * SSE: poll vote progress chat row while voting is open (client merges into league chat by message id).
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { leagueId } = await ctx.params
  if (!leagueId) return new Response('Bad request', { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return new Response('Forbidden', { status: 403 })

  const isBB = await isBigBrotherLeague(leagueId)
  if (!isBB) return new Response('Not found', { status: 404 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const tick = async () => {
        try {
          const current = await getCurrentCycleForLeague(leagueId)
          if (!current) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'noop' })}\n\n`))
            return
          }
          const cycle = await prisma.bigBrotherCycle.findUnique({
            where: { id: current.id },
            select: { voteProgressMessageId: true, phase: true },
          })
          if (!cycle?.voteProgressMessageId || cycle.phase !== 'VOTING_OPEN') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'noop' })}\n\n`))
            return
          }
          const msg = await prisma.leagueChatMessage.findUnique({
            where: { id: cycle.voteProgressMessageId },
            select: { id: true, message: true, metadata: true, createdAt: true },
          })
          if (!msg) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'noop' })}\n\n`))
            return
          }
          const payload = {
            type: 'vote_progress' as const,
            message: {
              id: msg.id,
              text: msg.message,
              metadata: (msg.metadata as Record<string, unknown> | null) ?? null,
              createdAt: msg.createdAt.toISOString(),
            },
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        } catch {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error' })}\n\n`))
        }
      }

      await tick()
      const id = setInterval(() => {
        void tick()
      }, 2000)

      req.signal.addEventListener('abort', () => {
        clearInterval(id)
        try {
          controller.close()
        } catch {
          /* ignore */
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
