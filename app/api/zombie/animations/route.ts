import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const leagueId = req.nextUrl.searchParams.get('leagueId')
  if (!leagueId) return new Response('leagueId required', { status: 400 })

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return new Response('Forbidden', { status: 403 })

  const onlyOpen = req.nextUrl.searchParams.get('isDelivered') === 'false'

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      const send = (data: unknown) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      send({ type: 'connected', leagueId })

      const seen = new Set<string>()
      const tick = async () => {
        const rows = await prisma.zombieEventAnimation.findMany({
          where: {
            leagueId,
            ...(onlyOpen ? { isDelivered: false } : {}),
          },
          orderBy: { createdAt: 'asc' },
          take: 30,
        })
        for (const a of rows) {
          if (seen.has(a.id)) continue
          seen.add(a.id)
          send({
            type: 'zombie_event_animation',
            leagueId: a.leagueId,
            week: a.week,
            animationType: a.animationType,
            primaryUserId: a.primaryUserId,
            secondaryUserId: a.secondaryUserId,
            metadata: a.metadata,
            durationMs: a.durationMs,
            reducedMotion: a.reducedMotion,
            id: a.id,
          })
        }
      }

      void tick()
      const iv = setInterval(() => void tick(), 4000)
      const hb = setInterval(() => send({ type: 'heartbeat', t: Date.now() }), 5000)
      setTimeout(() => {
        clearInterval(iv)
        clearInterval(hb)
        try {
          controller.close()
        } catch {
          /* ignore */
        }
      }, 300_000)
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
