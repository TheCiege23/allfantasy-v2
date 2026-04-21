/**
 * PROMPT 155 — Admin-only provider diagnostics. Safe metadata only (no secrets, no stack traces).
 * GET /api/admin/providers/diagnostics — requires admin session.
 */

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { runProviderHealthCheck } from '@/lib/ai-orchestration-engine'
import { runClearSportsHealthCheck } from '@/lib/clear-sports/client'
import { getProviderDiagnostics } from '@/lib/admin/provider-status-service'
import { getProviderStatus } from '@/lib/provider-config'

export const dynamic = 'force-dynamic'

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  try {
    const { prisma } = await import('@/lib/prisma')
    const healthEntries = await runProviderHealthCheck()
    const clearsportsHealth = await runClearSportsHealthCheck()
    const providerStatus = getProviderStatus()
    const payload = getProviderDiagnostics({
      healthEntries,
      providerStatus,
      clearSportsHealth: clearsportsHealth,
    })

    const clearSportsSyncHistory = await (prisma as any).providerSyncState.findMany({
      where: { provider: 'clear_sports' },
      orderBy: { updatedAt: 'desc' },
      take: 12,
      select: {
        entityType: true,
        sport: true,
        key: true,
        lastStartedAt: true,
        lastCompletedAt: true,
        lastSuccessAt: true,
        lastErrorAt: true,
        lastError: true,
        recordsImported: true,
        recordsUpdated: true,
        recordsSkipped: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      ...payload,
      clearSportsSyncHistory: clearSportsSyncHistory.map((row: any) => ({
        entityType: String(row.entityType ?? ''),
        sport: row.sport ? String(row.sport) : null,
        key: row.key ?? null,
        lastStartedAt: row.lastStartedAt ? new Date(row.lastStartedAt).getTime() : undefined,
        lastCompletedAt: row.lastCompletedAt ? new Date(row.lastCompletedAt).getTime() : undefined,
        lastSuccessAt: row.lastSuccessAt ? new Date(row.lastSuccessAt).getTime() : undefined,
        lastErrorAt: row.lastErrorAt ? new Date(row.lastErrorAt).getTime() : undefined,
        lastError: row.lastError ?? null,
        recordsImported: Number(row.recordsImported ?? 0),
        recordsUpdated: Number(row.recordsUpdated ?? 0),
        recordsSkipped: Number(row.recordsSkipped ?? 0),
        updatedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : Date.now(),
      })),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Diagnostics failed'
    console.warn('[admin/providers/diagnostics]', message)
    return NextResponse.json(
      { error: 'Failed to load provider diagnostics' },
      { status: 500 },
    )
  }
}
