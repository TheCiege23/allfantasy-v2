import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveLeagueAccess } from '@/lib/league-access'
import { leagueRealtimeStore } from '@/lib/league-events/realtime-store'

export const dynamic = 'force-dynamic'

function encodeSse(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

/**
 * SSE — league-scoped realtime hints (activity + fan-out). Same-process only; scale with shared pub/sub later.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> },
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })
  }

  const { leagueId } = await ctx.params
  if (!leagueId) {
    return new Response(JSON.stringify({ error: 'Missing leagueId' }), { status: 400, headers: { 'content-type': 'application/json' } })
  }

  const access = await resolveLeagueAccess(leagueId, userId)
  if (!access?.isMember) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'content-type': 'application/json' } })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(encodeSse(event, payload)))
      }

      send('connected', { leagueId, at: new Date().toISOString() })

      const unsubscribe = leagueRealtimeStore.subscribe(leagueId, (env) => {
        send('league_event', env)
      })

      const keepAlive = setInterval(() => {
        send('ping', { at: new Date().toISOString() })
      }, 25_000)

      req.signal.addEventListener(
        'abort',
        () => {
          clearInterval(keepAlive)
          unsubscribe()
          try {
            controller.close()
          } catch {
            /* closed */
          }
        },
        { once: true },
      )
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
