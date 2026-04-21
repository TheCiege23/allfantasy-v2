/**
 * /api/ai/ai-gm-analyze — canonical AI route (strangler-pattern wrapper).
 *
 * Thin passthrough that delegates to the legacy handler at /api/legacy/ai-gm-analyze.
 * Request/response shape is byte-for-byte identical to the legacy route.
 *
 * Telemetry: see /api/ai/manager-dna header note. Double-tagging is intentional.
 */

import { NextRequest } from 'next/server'
import { POST as legacyPost, GET as legacyGet } from '@/app/api/legacy/ai-gm-analyze/route'

export const POST = async (req: NextRequest) => {
  console.log('[ai-migration] /api/ai/ai-gm-analyze POST → delegating to legacy handler')
  return legacyPost(req, {})
}

export const GET = async (req: NextRequest) => {
  console.log('[ai-migration] /api/ai/ai-gm-analyze GET → delegating to legacy handler')
  return legacyGet(req, {})
}
