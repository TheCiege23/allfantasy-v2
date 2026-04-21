/**
 * /api/ai/opponent-tendencies — canonical AI route (strangler-pattern wrapper).
 *
 * Thin passthrough that delegates to the legacy handler at /api/legacy/opponent-tendencies.
 * Request/response shape is byte-for-byte identical to the legacy route.
 *
 * Telemetry double-tagging is intentional during migration (see /api/ai/manager-dna header).
 */

import { NextRequest } from 'next/server'
import { withApiUsage } from '@/lib/telemetry/usage'
import { POST as legacyPost, GET as legacyGet } from '@/app/api/legacy/opponent-tendencies/route'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const POST = withApiUsage({ endpoint: '/api/ai/opponent-tendencies', tool: 'AiOpponentTendencies' })(
  async (req: NextRequest) => {
    console.log('[ai-migration] /api/ai/opponent-tendencies POST → delegating to legacy handler')
    return legacyPost(req)
  },
)

export const GET = withApiUsage({ endpoint: '/api/ai/opponent-tendencies', tool: 'AiOpponentTendencies' })(
  async (req: NextRequest) => {
    console.log('[ai-migration] /api/ai/opponent-tendencies GET → delegating to legacy handler')
    return legacyGet(req)
  },
)
