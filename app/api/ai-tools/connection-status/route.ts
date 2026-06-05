/**
 * GET /api/ai-tools/connection-status
 * Real availability signals for dashboard AI tool chips (not env-only guesses).
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { computeIntelligencePlatformHealth } from '@/lib/intelligence/computePlatformHealth'
import { getAdminPerSportDataReliabilityRows } from '@/lib/admin-dashboard/AdminProviderHealthService'
import {
  getChimmySportReadiness,
  getDashboardAiToolAvailability,
} from '@/lib/admin-dashboard/SportImportMatrixService'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [health, sportReliability] = await Promise.all([
    computeIntelligencePlatformHealth(),
    getAdminPerSportDataReliabilityRows(),
  ])

  return NextResponse.json({
    database: health.database,
    sportsData: health.sportsData,
    news: health.news,
    aiEngine: health.aiEngine,
    rollingInsights: health.rollingInsights,
    clearSports: health.clearSports,
    computedAt: health.computedAt,
    aiToolAvailability: getDashboardAiToolAvailability(sportReliability),
    chimmySportReadiness: getChimmySportReadiness(sportReliability),
  })
}
