/**
 * GET /api/ai/providers — List AI providers and availability. No secrets.
 * Used for provider selector UI. Fallback when no provider available is handled by run/compare.
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
  const providers = [
    { id: 'openai', name: 'OpenAI', available: availability.openai, role: 'Final explanation, action plan, Chimmy' },
    { id: 'deepseek', name: 'DeepSeek', available: availability.deepseek, role: 'Analytical reasoning, numeric interpretation' },
    { id: 'grok', name: 'Grok', available: availability.grok, role: 'Narrative framing, trend explanation' },
  ]
  return NextResponse.json({ providers, availability })
}
