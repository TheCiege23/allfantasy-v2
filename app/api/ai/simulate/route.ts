import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { executeSimulateBody, simulateBodySchema } from '@/lib/ai/sim/simulateApiCore'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: Request) {
  const ip = getClientIp(req as never) || 'unknown'
  const rl = rateLimit(`ai-sim:${ip}`, 20, 60_000)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many simulation requests' }, { status: 429 })
  }

  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = simulateBodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const result = executeSimulateBody(parsed.data)
    return NextResponse.json({ ok: true, result })
  } catch (e) {
    console.error('[api/ai/simulate]', e)
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 })
  }
}
