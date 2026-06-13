import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { survivorClipFromAuditEntry, survivorClipFromAuditLog } from '@/lib/survivor/videoAssets'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest, ctx: { params: Promise<{ leagueId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return new Response('leagueId required', { status: 400 })

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return new Response('Forbidden', { status: 403 })

  const sinceRaw = req.nextUrl.searchParams.get('since')
  const sinceDate = sinceRaw ? new Date(sinceRaw) : null
  const sinceOk = sinceDate && !Number.isNaN(sinceDate.getTime()) ? sinceDate : new Date(Date.now() - 60_000)

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      const send = (data: unknown) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      send({ type: 'connected', leagueId })

      const seen = new Set<string>()
      const tick = async () => {
        const [entries, logs] = await Promise.all([
          prisma.survivorAuditEntry.findMany({
            where: { leagueId, createdAt: { gte: sinceOk } },
            orderBy: { createdAt: 'asc' },
            take: 40,
            select: {
              id: true,
              category: true,
              action: true,
              createdAt: true,
            },
          }),
          prisma.survivorAuditLog.findMany({
            where: { leagueId, createdAt: { gte: sinceOk } },
            orderBy: { createdAt: 'asc' },
            take: 40,
            select: { id: true, eventType: true, createdAt: true },
          }),
        ])

        for (const row of entries) {
          const sid = `e:${row.id}`
          if (seen.has(sid)) continue
          const clip = survivorClipFromAuditEntry(row)
          if (!clip) {
            seen.add(sid)
            continue
          }
          seen.add(sid)
          send({
            type: 'survivor_moment',
            id: sid,
            source: 'audit_entry' as const,
            clipUrl: clip.url,
            clipType: clip.type,
            label: clip.label,
            durationMs: 10_000,
            category: row.category,
            action: row.action,
          })
        }

        for (const row of logs) {
          const sid = `l:${row.id}`
          if (seen.has(sid)) continue
          const clip = survivorClipFromAuditLog(row)
          if (!clip) {
            seen.add(sid)
            continue
          }
          seen.add(sid)
          send({
            type: 'survivor_moment',
            id: sid,
            source: 'audit_log' as const,
            clipUrl: clip.url,
            clipType: clip.type,
            label: clip.label,
            durationMs: 10_000,
            eventType: row.eventType,
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
