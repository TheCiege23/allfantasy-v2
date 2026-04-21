/**
 * /api/ai/manager-dna — canonical AI route (strangler-pattern wrapper).
 *
 * Thin passthrough that delegates to the legacy handler at /api/legacy/manager-dna.
 * Request/response shape is byte-for-byte identical to the legacy route.
 *
 * Telemetry: this route fires its own `withApiUsage` tag for migration-adoption
 * tracking; the delegated legacy handler also fires its own tag, so every call
 * produces BOTH `/api/ai/manager-dna` and `/api/legacy/manager-dna` usage rows.
 * This is intentional during migration.
 */

import { NextRequest } from 'next/server'
import { withApiUsage } from '@/lib/telemetry/usage'
import { POST as legacyPost, GET as legacyGet } from '@/app/api/legacy/manager-dna/route'

export const POST = withApiUsage({ endpoint: '/api/ai/manager-dna', tool: 'AiManagerDna' })(
  async (req: NextRequest) => {
    console.log('[ai-migration] /api/ai/manager-dna POST → delegating to legacy handler')
    return legacyPost(req, {})
  },
)

export const GET = withApiUsage({ endpoint: '/api/ai/manager-dna', tool: 'AiManagerDna' })(
  async (req: NextRequest) => {
    console.log('[ai-migration] /api/ai/manager-dna GET → delegating to legacy handler')
    return legacyGet(req, {})
  },
)
