/**
 * /api/ai/community-insights — canonical AI route (strangler-pattern wrapper).
 *
 * Thin passthrough that delegates to the legacy handler at /api/legacy/community-insights.
 * Request/response shape is byte-for-byte identical to the legacy route.
 *
 * Telemetry double-tagging is intentional during migration.
 */

import { NextRequest } from 'next/server'
import { withApiUsage } from '@/lib/telemetry/usage'
import { GET as legacyGet } from '@/app/api/legacy/community-insights/route'

export const GET = withApiUsage({ endpoint: '/api/ai/community-insights', tool: 'AiCommunityInsights' })(
  async (req: NextRequest) => {
    console.log('[ai-migration] /api/ai/community-insights GET → delegating to legacy handler')
    return legacyGet(req, {})
  },
)
