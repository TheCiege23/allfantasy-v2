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
      const ivKeeper = setInterval(() => {
        send({
          type: 'keeper_phase_tick',
          seasonId,
          note: 'Wire Redis pub/sub for keeper_submitted / keeper_locked events.',
        })
      }, 15000)
      const ivGuillotine = setInterval(() => {
        send({
          type: 'guillotine_score_update',
          seasonId,
          rosterId: null,
          teamName: null,
          currentScore: 0,
          survivalRank: 0,
          teamsActive: 0,
          marginAboveChopLine: 0,
          isInDangerZone: false,
          note: 'Wire live scores → survival snapshot.',
        })
      }, 12000)
      const ivSurvivor = setInterval(() => {
        send({
          type: 'tribal_council_opened',
          seasonId,
          councilId: null,
          tribeId: null,
          deadline: null,
          note: 'Wire Survivor pub/sub for council + reveal.',
        })
        send({
          type: 'host_message',
          seasonId,
          channelType: 'league_chat',
          messageType: 'heartbeat',
          preview: 'Survivor stream alive',
        })
      }, 20000)
      const close = () => {
        clearInterval(iv)
        clearInterval(ivKeeper)
        clearInterval(ivGuillotine)
        clearInterval(ivSurvivor)
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
