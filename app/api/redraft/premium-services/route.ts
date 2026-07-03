import { NextResponse } from 'next/server'
import { buildNflRedraftPremiumProductContract } from '@/lib/redraft-premium/nflRedraftPremiumApiContracts'

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

  const result = buildNflRedraftPremiumProductContract(
    typeof body === 'object' && body ? body : {},
  )
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
