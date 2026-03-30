import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { getProviderStatus } from '@/lib/provider-config'
import { getDraftAutomationMatrix } from '@/lib/draft-automation-policy'

export const dynamic = 'force-dynamic'

function isDraftEndpoint(endpoint: string | null): boolean {
  const value = String(endpoint ?? '').toLowerCase()
  return value.includes('/draft/')
}

function isDraftAiEndpoint(endpoint: string | null, tool: string | null): boolean {
  const e = String(endpoint ?? '').toLowerCase()
  const t = String(tool ?? '').toLowerCase()
  return (
    e.includes('/draft/recap') ||
    e.includes('/trade-proposals/') ||
    e.includes('/draft/queue/ai-reorder') ||
    e.includes('/mock-draft/ai-pick') ||
    t.includes('draft') && t.includes('ai')
  )
}

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const providerStatus = getProviderStatus()
  const matrix = getDraftAutomationMatrix()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  try {
    const rows = await prisma.apiUsageRollup.findMany({
      where: { bucketType: 'hour', bucketStart: { gte: since } },
      select: {
        endpoint: true,
        tool: true,
        count: true,
        okCount: true,
        errCount: true,
      },
    })

    let draftCalls = 0
    let draftErrors = 0
    let draftAiCalls = 0
    for (const row of rows) {
      if (isDraftEndpoint(row.endpoint)) {
        draftCalls += row.count ?? 0
        draftErrors += row.errCount ?? 0
      }
      if (isDraftAiEndpoint(row.endpoint, row.tool)) {
        draftAiCalls += row.count ?? 0
      }
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      providerStatus,
      usage24h: {
        draftCalls,
        draftErrors,
        draftAiCalls,
        deterministicSharePct: draftCalls > 0 ? Math.max(0, Math.min(100, Math.round(((draftCalls - draftAiCalls) / draftCalls) * 100))) : 100,
      },
      executionMatrix: matrix,
    })
  } catch (e) {
    console.error('[admin/draft-automation/diagnostics]', e)
    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        providerStatus,
        usage24h: null,
        executionMatrix: matrix,
      },
      { status: 200 }
    )
  }
}
