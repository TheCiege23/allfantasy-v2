/**
 * GET /api/ai/tools — List registered AI tools. No dead routes; registry loads from lib/ai-tool-registry.
 * Used for tool selector and to validate tool keys before calling /api/ai/run.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAIToolRegistry } from '@/lib/ai-tool-registry'

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const registry = getAIToolRegistry()
  const tools = registry.map((t) => ({
    toolKey: t.toolKey,
    toolName: t.toolName,
    deterministicRequired: t.deterministicRequired,
    allowedProviders: t.allowedProviders,
    supportedModes: t.supportedModes,
    requiredContextFields: t.requiredContextFields,
    responseSchema: t.responseSchema,
  }))
  return NextResponse.json({
    tools,
    endpoints: {
      run: '/api/ai/run',
      compare: '/api/ai/compare',
      providers: '/api/ai/providers',
      chimmy: '/api/ai/chimmy',
    },
    clickAuditSupport: {
      runAnalysis: true,
      compareProviders: true,
      openInChimmy: true,
      retryAnalysis: true,
    },
  })
}
