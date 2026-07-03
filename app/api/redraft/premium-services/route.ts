import { NextResponse } from 'next/server'
import { buildNflRedraftPremiumProductContract } from '@/lib/redraft-premium/nflRedraftPremiumApiContracts'
import { resolveNflRedraftPremiumEvidence } from '@/lib/redraft-premium/nflRedraftPremiumEvidenceResolver'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        modelVersion: 'nfl-redraft-premium-api-contract-v1',
        ok: false,
        error: {
          code: 'invalid_request',
          message: 'Request body must be valid JSON.',
          fields: ['body'],
        },
      },
      { status: 400 },
    )
  }

  const requestBody = typeof body === 'object' && body ? body : {}
  const preflight = buildNflRedraftPremiumProductContract(requestBody)
  if (!preflight.ok) return NextResponse.json(preflight, { status: 400 })

  const resolved = resolveNflRedraftPremiumEvidence({
    serviceId: preflight.serviceType,
    serviceVariant: preflight.serviceVariant,
    canonicalIds: preflight.canonicalIds,
    ingestedAtIso: preflight.generatedAtIso,
  })

  const result = buildNflRedraftPremiumProductContract(requestBody, {
    evidencePackets: resolved.evidencePackets,
    resolverStatus: resolved.resolverStatus,
    evidenceCounts: resolved.evidenceCounts,
  })
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
