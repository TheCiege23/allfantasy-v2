/**
 * /api/ai/waiver/leagues — canonical AI route (strangler-pattern wrapper).
 *
 * Thin passthrough that delegates to the legacy handler at /api/legacy/waiver/leagues.
 * Request/response shape is byte-for-byte identical to the legacy route.
 *
 * Telemetry double-tagging is intentional during migration.
 */

import { NextRequest } from 'next/server'
import { withApiUsage } from '@/lib/telemetry/usage'
import { GET as legacyGet } from '@/app/api/legacy/waiver/leagues/route'

export const GET = withApiUsage({ endpoint: '/api/ai/waiver/leagues', tool: 'AiWaiverLeagues' })(
  async (req: NextRequest) => {
    console.log('[ai-migration] /api/ai/waiver/leagues GET → delegating to legacy handler')
    return legacyGet(req, {})
  },
)
