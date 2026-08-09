/**
 * GET /api/ai/providers/status — provider availability (no secrets).
 * Returns which providers are configured. Used to avoid dead provider selector states.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getProviderStatus, getProviderSurfaceStatus } from '@/lib/provider-config'
import { getClearSportsToolStates } from '@/lib/clear-sports'
import { isOpenClawConfigured, isOpenClawGrowthConfigured } from '@/lib/openclaw/config'

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = getProviderStatus()
  const surfaces = getProviderSurfaceStatus(status)

  return NextResponse.json({
    openai: status.openai,
    deepseek: status.deepseek,
    grok: status.xai,
    xai: status.xai,
    clearsports: status.clearsports,
    anyAi: status.anyAi,
    openclaw: isOpenClawConfigured(),
    openclawGrowth: isOpenClawGrowthConfigured(),
    surfaces,
    clearsportsTools: getClearSportsToolStates(status.clearsports),
  })
}
