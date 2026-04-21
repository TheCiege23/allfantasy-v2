import { NextRequest } from 'next/server'
import { withApiUsage } from '@/lib/telemetry/usage'
import { POST as legacyPost } from '@/app/api/legacy/trade/league-analyze/route'

// Match legacy route's timeout configuration
export const maxDuration = 120 // 2 minutes for multi-API orchestration

export const POST = withApiUsage({ endpoint: '/api/ai/trade/league-analyze', tool: 'AiTradeLeagueAnalyze' })(
  async (req: NextRequest) => {
    console.log('[ai-migration] /api/ai/trade/league-analyze POST → delegating to legacy handler')
    return legacyPost(req, {})
  },
)
