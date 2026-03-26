/**
 * POST /api/ai/run — Run AI analysis. Accepts PROMPT 124 request contract or legacy envelope.
 * Request contract: { tool, sport, leagueSettings, deterministicContext, aiMode, provider }.
 * Response contract: { evidence, aiExplanation, actionPlan, confidence, uncertainty, providerResults }.
 * Supports: run analysis, retry analysis (client re-posts), compare providers (use /api/ai/compare for multi-provider).
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runUnifiedOrchestration } from '@/lib/ai-orchestration'
import type { OrchestrationMode } from '@/lib/unified-ai/types'
import { validateAIRequest } from '@/lib/ai-orchestration/request-validator'
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

  if (isRequestContract(body)) {
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
    let responseContract: AIToolResponseContract = unifiedResponseToContract(result.response)
    const toolLayerKey = resolveToolKeyAlias(contract.tool)
    if (toolLayerKey) {
      const formatted = formatToolResult({
        toolKey: toolLayerKey,
        primaryAnswer: responseContract.aiExplanation || result.response.primaryAnswer,
        structured: getStructuredCandidate(result.response),
        envelope: unified.envelope,
        factGuardWarnings: result.response.factGuardWarnings ?? undefined,
      })
      const toolFactGuard = validateToolOutput(formatted.output, unified.envelope)
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

  const envelopeRaw = (body as Record<string, unknown>)?.envelope
  if (!envelopeRaw || typeof envelopeRaw !== 'object') {
    return NextResponse.json(
      {
        code: 'envelope_validation_failed',
        message: 'envelope is required for legacy request format.',
        userMessage: 'Invalid request. Include an envelope with featureType and sport.',
      },
      { status: 400 }
    )
  }

  const envelopeWithUser = {
    ...(envelopeRaw as Record<string, unknown>),
    userId: (envelopeRaw as Record<string, unknown>)?.userId ?? session.user?.id ?? null,
  }
  const validation = validateAIRequest({ ...body, envelope: envelopeWithUser })
  if (!validation.valid || !validation.envelope) {
    return NextResponse.json(
      {
        code: 'envelope_validation_failed',
        message: validation.errorMessage ?? 'Invalid envelope.',
        userMessage: validation.errorMessage ?? 'Include an envelope with featureType and sport.',
      },
      { status: 400 }
    )
  }

  const result = await runUnifiedOrchestration({
    envelope: validation.envelope,
    mode: (body as Record<string, unknown>).mode as OrchestrationMode | undefined,
    options: (body as Record<string, unknown>).options as Record<string, unknown> | undefined,
  })

  if (result.ok) {
    return NextResponse.json(result.response)
  }

  return NextResponse.json(
    {
      code: result.error.code,
      message: result.error.message,
      userMessage: result.error.userMessage,
      provider: result.error.provider,
      traceId: result.error.traceId,
      details: result.error.details,
    },
    { status: result.status }
  )
}
