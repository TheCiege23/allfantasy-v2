import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { draftIntelStateStore, publishDraftIntelState } from '@/lib/draft-intelligence'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'

export const dynamic = 'force-dynamic'

function encodeSse(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })
  }

  const leagueId = req.nextUrl.searchParams.get('leagueId') ?? ''
  if (!leagueId) {
    return new Response(JSON.stringify({ error: 'leagueId is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(encodeSse(event, payload)))
      }

      const initial =
        draftIntelStateStore.get(leagueId, userId) ??
        (await publishDraftIntelState({ leagueId, userId, trigger: 'manual' }).catch(() => null))
      if (initial) {
        send('snapshot', initial)
      }

      const unsubscribe = draftIntelStateStore.subscribe(leagueId, userId, (event) => {
        send(event.type, event.state)
      })

      const keepAlive = setInterval(() => {
        send('keepalive', { leagueId, at: new Date().toISOString() })
      }, 15_000)

      req.signal.addEventListener(
        'abort',
        () => {
          clearInterval(keepAlive)
          unsubscribe()
          try {
            controller.close()
          } catch {
            // Stream may already be closed.
          }
        },
        { once: true }
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
