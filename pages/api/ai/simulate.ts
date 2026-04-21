import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { executeSimulateBody, simulateBodySchema } from '@/lib/ai/sim/simulateApiCore'
import { rateLimit } from '@/lib/rate-limit'

function getIp(req: NextApiRequest): string {
  const xff = req.headers['x-forwarded-for']
  if (typeof xff === 'string') return xff.split(',')[0]?.trim() || 'unknown'
  if (Array.isArray(xff)) return xff[0]?.split(',')[0]?.trim() || 'unknown'
  return (req.socket?.remoteAddress as string) || 'unknown'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const ip = getIp(req)
  const rl = rateLimit(`ai-sim:${ip}`, 20, 60_000)
  if (!rl.success) {
    res.status(429).json({ error: 'Too many simulation requests' })
    return
  }

  const session = (await getServerSession(req, res, authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const parsed = simulateBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() })
    return
  }

  try {
    const result = executeSimulateBody(parsed.data)
    res.status(200).json({ ok: true, result })
  } catch (e) {
    console.error('[pages/api/ai/simulate]', e)
    res.status(500).json({ error: 'Simulation failed' })
  }
}
