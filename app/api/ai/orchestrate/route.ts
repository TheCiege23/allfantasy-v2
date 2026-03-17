/**
 * POST /api/ai/orchestrate — unified AI orchestration. Single entry for all AI tools.
 * Supports: provider selector (via response.providerStatus), mode selector (request.mode),
 * retry (client re-posts), compare providers (response.modelOutputs), open in Chimmy (client builds link), save analysis (client or separate API).
 * All provider keys server-side only. Deterministic-first.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runUnifiedOrchestration } from '@/lib/ai-orchestration/orchestration-service'
import type { UnifiedAIRequest } from '@/lib/ai-orchestration/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.', code: 'envelope_validation_failed' },
      { status: 400 }
    )
  }

  const request: UnifiedAIRequest = body as UnifiedAIRequest
  if (!request.envelope) {
    return NextResponse.json(
      { error: 'envelope is required.', code: 'envelope_validation_failed' },
      { status: 400 }
    )
  }

  const result = await runUnifiedOrchestration(request)

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        traceId: result.error.traceId,
      },
      { status: result.status }
    )
  }

  return NextResponse.json({
    ok: true,
    response: result.response,
    traceId: result.response.traceId,
  })
}
