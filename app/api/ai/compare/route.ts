/**
 * POST /api/ai/compare — Run AI with multiple providers and return comparison (providerResults).
 * Same request contract as /api/ai/run; forces consensus mode so all providers run. Supports compare providers UI.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runUnifiedOrchestration } from '@/lib/ai-orchestration'
import {
  validateToolRequest,
  requestContractToUnified,
  unifiedResponseToContract,
  type AIToolRequestContract,
  type AIToolResponseContract,
} from '@/lib/ai-tool-registry'
import { formatToolResult, resolveToolKeyAlias, validateToolOutput } from '@/lib/ai-tool-layer'

function isRequestContract(body: Record<string, unknown>): boolean {
  return typeof body.tool === 'string' && typeof body.sport === 'string'
}

function getStructuredCandidate(response: { modelOutputs?: Array<{ model?: string; structured?: unknown }> }): Record<string, unknown> | null {
  const openaiStructured = response.modelOutputs?.find(
    (item) => item.model === 'openai' && item.structured && typeof item.structured === 'object'
  )?.structured
  if (openaiStructured && typeof openaiStructured === 'object') {
    return openaiStructured as Record<string, unknown>
  }
  const anyStructured = response.modelOutputs?.find(
    (item) => item.structured && typeof item.structured === 'object'
  )?.structured
  return anyStructured && typeof anyStructured === 'object'
    ? (anyStructured as Record<string, unknown>)
    : null
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

  if (!isRequestContract(body)) {
    return NextResponse.json(
      {
        code: 'envelope_validation_failed',
        message: 'Request must include tool and sport (request contract).',
        userMessage: 'Use tool and sport for compare.',
      },
      { status: 400 }
    )
  }

  const contract = body as unknown as AIToolRequestContract
  const validation = validateToolRequest(contract.tool, contract.deterministicContext ?? undefined)
  if (!validation.valid) {
    return NextResponse.json(
      {
        code: 'envelope_validation_failed',
        message: validation.error,
        userMessage: validation.error ?? 'Unsupported tool or missing required context.',
      },
      { status: 400 }
    )
  }

  const unified = requestContractToUnified(contract, session.user.id)
  const compareRequest = {
    ...unified,
    mode: 'consensus' as const,
    envelope: {
      ...unified.envelope,
      modelRoutingHints: undefined,
    },
  }

  const result = await runUnifiedOrchestration(compareRequest)
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

  let responseContract: AIToolResponseContract = unifiedResponseToContract(result.response)
  const toolLayerKey = resolveToolKeyAlias(contract.tool)
  if (toolLayerKey) {
    const formatted = formatToolResult({
      toolKey: toolLayerKey,
      primaryAnswer: responseContract.aiExplanation || result.response.primaryAnswer,
      structured: getStructuredCandidate(result.response),
      envelope: compareRequest.envelope,
      factGuardWarnings: result.response.factGuardWarnings ?? undefined,
    })
    const toolFactGuard = validateToolOutput(formatted.output, compareRequest.envelope)
    const outputConfidence =
      typeof formatted.output.confidence === 'number'
        ? formatted.output.confidence
        : formatted.output.confidence.pct ?? null
    const factGuardWarnings = Array.from(
      new Set([
        ...(responseContract.factGuardWarnings ?? []),
        ...formatted.factGuardWarnings,
        ...toolFactGuard.warnings,
        ...toolFactGuard.errors.map((err) => `Fact guard: ${err}`),
      ])
    )

    responseContract = {
      ...responseContract,
      aiExplanation: formatted.output.narrative ?? responseContract.aiExplanation,
      evidence: responseContract.evidence.length ? responseContract.evidence : formatted.output.keyEvidence,
      confidence: responseContract.confidence ?? outputConfidence,
      uncertainty:
        responseContract.uncertainty ??
        formatted.output.risksCaveats[0] ??
        (toolFactGuard.errors.length ? 'Some claims could not be fully validated against deterministic context.' : null),
      verdict: formatted.output.verdict,
      risksCaveats: formatted.output.risksCaveats,
      suggestedNextAction: formatted.output.suggestedNextAction,
      alternatePath: formatted.output.alternatePath ?? null,
      sections: formatted.sections,
      outputShape: {
        verdict: formatted.output.verdict,
        keyEvidence: formatted.output.keyEvidence,
        confidence: formatted.output.confidence,
        risksCaveats: formatted.output.risksCaveats,
        suggestedNextAction: formatted.output.suggestedNextAction,
        alternatePath: formatted.output.alternatePath,
      },
      factGuardWarnings,
    }
  }
  return NextResponse.json(responseContract)
}
