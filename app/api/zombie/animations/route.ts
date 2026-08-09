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

  const leagueId = req.nextUrl.searchParams?.get('leagueId')
  if (!leagueId) return new Response('leagueId required', { status: 400 })

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return new Response('Forbidden', { status: 403 })

  const onlyOpen = req.nextUrl.searchParams?.get('isDelivered') === 'false'
  const sinceRaw = req.nextUrl.searchParams.get('since')
  const sinceDate = sinceRaw ? new Date(sinceRaw) : null
  const sinceValid = sinceDate && !Number.isNaN(sinceDate.getTime()) ? sinceDate : null

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      let closed = false
      let iv: ReturnType<typeof setInterval> | null = null
      let hb: ReturnType<typeof setInterval> | null = null
      let endTimer: ReturnType<typeof setTimeout> | null = null
      const shutdown = () => {
        closed = true
        if (iv) clearInterval(iv)
        if (hb) clearInterval(hb)
        if (endTimer) clearTimeout(endTimer)
      }
      const send = (data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          shutdown()
        }
      }
      send({ type: 'connected', leagueId })

      const seen = new Set<string>()
      const tick = async () => {
        if (closed) return
        const rows = await prisma.zombieEventAnimation.findMany({
          where: {
            leagueId,
            ...(sinceValid ? { createdAt: { gte: sinceValid } } : {}),
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
      iv = setInterval(() => void tick(), 4000)
      hb = setInterval(() => send({ type: 'heartbeat', t: Date.now() }), 5000)
      endTimer = setTimeout(() => {
        shutdown()
        try {
          controller.close()
        } catch {
          /* ignore */
        }
      }, 300_000)
    },
    cancel() {
      // Client disconnected; stop timers to avoid enqueue-after-close errors.
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

