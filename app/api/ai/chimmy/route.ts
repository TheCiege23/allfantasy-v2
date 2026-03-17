/**
 * POST /api/ai/chimmy — Chimmy chat via unified orchestration (tool=chimmy_chat).
 * Same request contract; tool is chimmy_chat. For dedicated Chimmy UI use /api/chat/chimmy (form/messages).
 * This route allows run/compare/retry/open-in-Chimmy flows with the same contract.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runUnifiedOrchestration } from '@/lib/ai-orchestration'
import {
  validateToolRequest,
  requestContractToUnified,
  unifiedResponseToContract,
} from '@/lib/ai-tool-registry'

function isRequestContract(body: Record<string, unknown>): boolean {
  return typeof body.tool === 'string' && typeof body.sport === 'string'
}

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: 'unauthorized', message: 'Unauthorized', userMessage: 'You need to sign in to use this feature.' },
      { status: 401 }
    )
  }

  let body: Record<string, unknown>
  try {
    const b = await req.json()
    body = typeof b === 'object' && b != null ? (b as Record<string, unknown>) : {}
  } catch {
    return NextResponse.json(
      {
        code: 'envelope_validation_failed',
        message: 'Invalid JSON',
        userMessage: 'Invalid request. Check that the body is valid JSON.',
      },
      { status: 400 }
    )
  }

  const contract = {
    ...body,
    tool: (body.tool as string) || 'chimmy_chat',
    sport: (body.sport as string) || 'NFL',
    userMessage: (typeof body.userMessage === 'string' ? body.userMessage : typeof body.message === 'string' ? body.message : '') as string,
    userId: session.user.id,
  }
  const validation = validateToolRequest(contract.tool, (contract as { deterministicContext?: Record<string, unknown> }).deterministicContext ?? undefined)
  if (!validation.valid) {
    return NextResponse.json(
      {
        code: 'envelope_validation_failed',
        message: validation.error,
        userMessage: validation.error ?? 'Invalid Chimmy request.',
      },
      { status: 400 }
    )
  }

  const unified = requestContractToUnified(contract, session.user.id)
  if (!unified.envelope.userMessage && !unified.envelope.deterministicPayload) {
    return NextResponse.json(
      {
        code: 'envelope_validation_failed',
        message: 'userMessage or message is required for Chimmy.',
        userMessage: 'Send a message to Chimmy.',
      },
      { status: 400 }
    )
  }

  const result = await runUnifiedOrchestration(unified)
  if (!result.ok) {
    return NextResponse.json(
      {
        code: result.error.code,
        message: result.error.message,
        userMessage: result.error.userMessage,
        provider: result.error.provider,
        traceId: result.error.traceId,
      },
      { status: result.status }
    )
  }

  const responseContract = unifiedResponseToContract(result.response)
  return NextResponse.json(responseContract)
}
