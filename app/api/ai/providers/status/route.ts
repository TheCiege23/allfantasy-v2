/**
 * GET /api/ai/providers/status — provider availability (no secrets).
 * Returns which providers are configured. Used to avoid dead provider selector states.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkProviderAvailability } from '@/lib/ai-orchestration'

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const availability = checkProviderAvailability()
  return NextResponse.json(availability)
}
