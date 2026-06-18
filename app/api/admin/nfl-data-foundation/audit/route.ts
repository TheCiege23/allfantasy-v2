import { NextRequest, NextResponse } from 'next/server'
import { requireAdminOrBearer } from '@/lib/adminAuth'
import { getCanonicalNflDataCoverage } from '@/lib/nfl-data-foundation/nflDataCoverage'

export const dynamic = 'force-dynamic'

function numericParam(value: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function GET(request: NextRequest) {
  const gate = await requireAdminOrBearer(request)
  if (!gate.ok) return gate.res

  const url = new URL(request.url)
  const season = numericParam(url.searchParams.get('season'))
  const week = numericParam(url.searchParams.get('week')) ?? null
  const coverage = await getCanonicalNflDataCoverage({ season, week })

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    coverage,
  })
}
