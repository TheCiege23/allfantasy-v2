import { NextResponse } from 'next/server'
import {
  buildNflRedraftPremiumProductContract,
  buildNflRedraftPremiumProductError,
} from '@/lib/redraft-premium/nflRedraftPremiumApiContracts'
import {
  enforceNflRedraftPremiumAccess,
  stripClientEntitlementForServerResolution,
} from '@/lib/redraft-premium/nflRedraftPremiumAccessBoundary'
import { resolveNflRedraftPremiumEvidence } from '@/lib/redraft-premium/nflRedraftPremiumEvidenceResolver'
import { loadNflRedraftPremiumProductionEvidence } from '@/lib/redraft-premium/nflRedraftPremiumProductionEvidenceSource'

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

  const access = await enforceNflRedraftPremiumAccess({
    leagueId: preflight.canonicalIds.leagueId ?? '',
    serviceId: preflight.serviceType,
    serviceVariant: preflight.serviceVariant,
  })
  if (!access.ok) {
    return NextResponse.json(
      buildNflRedraftPremiumProductError(access.code, access.message, access.fields),
      { status: access.status },
    )
  }

  const serverRequestBody = stripClientEntitlementForServerResolution(
    requestBody as Record<string, unknown>,
    access.entitlement,
  )
  const serverPreflight = buildNflRedraftPremiumProductContract(serverRequestBody)
  if (!serverPreflight.ok) return NextResponse.json(serverPreflight, { status: 400 })

  const productionEvidence = await loadNflRedraftPremiumProductionEvidence({
    serviceId: serverPreflight.serviceType,
    canonicalIds: serverPreflight.canonicalIds,
    ingestedAtIso: serverPreflight.generatedAtIso,
  })

  const resolved = resolveNflRedraftPremiumEvidence({
    serviceId: serverPreflight.serviceType,
    serviceVariant: serverPreflight.serviceVariant,
    canonicalIds: serverPreflight.canonicalIds,
    ingestedAtIso: serverPreflight.generatedAtIso,
    availableEvidencePackets: productionEvidence,
  })

  const result = buildNflRedraftPremiumProductContract(serverRequestBody, {
    evidencePackets: resolved.evidencePackets,
    resolverStatus: resolved.resolverStatus,
    evidenceCounts: resolved.evidenceCounts,
  })
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
