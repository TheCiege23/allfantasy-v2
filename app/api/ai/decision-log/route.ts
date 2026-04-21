/**
 * /api/ai/decision-log — canonical AI route (strangler-pattern wrapper).
 *
 * Thin passthrough that delegates to the legacy handler at /api/legacy/decision-log.
 * Request/response shape is byte-for-byte identical to the legacy route.
 *
 * Telemetry double-tagging is intentional during migration (see /api/ai/manager-dna header).
 */

import { NextRequest } from 'next/server'
import { withApiUsage } from '@/lib/telemetry/usage'
import { POST as legacyPost, GET as legacyGet } from '@/app/api/legacy/decision-log/route'

export const POST = withApiUsage({ endpoint: '/api/ai/decision-log', tool: 'AiDecisionLog' })(
  async (req: NextRequest) => {
    console.log('[ai-migration] /api/ai/decision-log POST → delegating to legacy handler')
    return legacyPost(req)
  },
)

export const GET = withApiUsage({ endpoint: '/api/ai/decision-log', tool: 'AiDecisionLog' })(
  async (req: NextRequest) => {
    console.log('[ai-migration] /api/ai/decision-log GET → delegating to legacy handler')
    return legacyGet(req)
  },
)
