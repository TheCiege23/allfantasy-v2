import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  context: { params: { seasonId: string } },
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { seasonId } = context.params
  const season = await prisma.redraftSeason.findFirst({ where: { id: seasonId } })
  if (!season) {
    return new Response('Not found', { status: 404 })
  }

  const gate = await assertLeagueMember(season.leagueId, userId)
  if (!gate.ok) {
    return new Response('Forbidden', { status: 403 })
  }

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      const send = (data: unknown) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      send({ type: 'connected', seasonId })
      const iv = setInterval(() => {
        send({ type: 'heartbeat', t: Date.now() })
      }, 5000)
      const close = () => {
        clearInterval(iv)
        try {
          controller.close()
        } catch {
          /* ignore */
        }
      }
      // Note: no request signal in all runtimes — client disconnect closes EventSource.
      setTimeout(close, 300_000)
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
